(function() {
  // root 保存全局变量。
  const root = this;

  // 简写各种方法
  const objProto = Object.prototype,
        ArrayProto = Array.prototype;

  // Object.prototype.toString 方法会返回变量类型
  const toString = objProto.toString,
        hasOwnProperty = objProto.hasOwnProperty;
  
  const slice = ArrayProto.slice;
  
  // 返回表示对象自身可枚举属性字符串的数组
  const nativeKeys = Object.keys,
        nativeCreate = Object.create;

  // 创建 _ 函数（构造函数？）
  const _ = function (obj) {
    if (obj instanceof _) {
      return obj;
    }
    if (!(this instanceof _)) {
      return new _(obj);
    }
    this._wrapped = obj;
  }

  const Ctor = function(){};

  const MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  // 定义类数组判断
  const isArrayLike = function (collection) {
    let length = collection != null && collection.length;
    return typeof (length) === "number" && length >= 0 && length <= MAX_ARRAY_INDEX;
  }
  
  const optimizeCb = function (fn, context, argCount) {
    if (context === void 0) return fn;
    return function (...args) {
      return fn.apply(context, args);
    }
  }

  // 返回一个函数，作用是将第二个之后参数的属性添加到第一个参数对象obj中，并返回第一个参数对象
  // keysFunc 函数主要是用于获取对象的属性（自有属性或全部属性）
  const createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      let length = arguments.length;
      if(length < 2 || obj == null) return obj;
      for (let index = 1; index < length; index++) {
        let source = arguments[index],
          keys = keysFunc(source);
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          if(!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    }
  }

  // 创建一个继承原型函数的函数实例
  const baseCreate = function(prototype) {
    if(!_.isObject(prototype)) return {};
    if(nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    let result = new Ctor();
    // 重写Ctor.prototype，切断了Ctor与result之间的联系
    // result._proto_指向仍然是原Ctor.prototype(prototype)
    Ctor.prototype = null;
    return result;
  }

  const createReduce = function(dir) {
    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context);
      let keys = !isArrayLike(obj) && _.keys(obj),
          length = keys || obj.length,
          // dir>0从第一个元素开始， dir<0从最后一个元素开始
          // dir 值为步长
          index = dir>0 ? 0 :length - 1;
      if(arguments.length < 3) {
        // memo参数是初始值
        memo = obj[keys?keys[index]:index];
        index += dir;
      }
      return (function(obj, iteratee, memo, keys, index, length) {
        for(; index>=0&&index<length; index+=dir) {
          let currentKey = keys?keys[index]:index;
          memo = iteratee(memo, obj[currentKey], currentKey, obj);
        }
        return memo;
      })(obj, iteratee, memo, keys, index, length);
    }
  }

  // 在数组中查找特定的元素，并返回index
  const createIndexFinder = function(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      let length = array != null && array.length,
          index = dir > 0 ? 0 : length - 1;
      for(; index >= 0 && index < length; index += dir) {
        // predicate 方法需要返回可以正确转化为boolean值
        if(predicate(array[index], index, array)) return index;
      }
      return -1;
    }
  }
  
  // 函数也可以返回true；由于返回的是!!obj，null会返回为false
  _.isObject = function(obj) {
    let type = typeof obj;
    return type === "function" || type === "object" && !!obj;
  }

  // 遍历对象，并对其中的每一项执行iteratee方法
  _.each = function (obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    let i;
    if (isArrayLike(obj)) {
      for (i = 0; i < obj.length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      for (i in obj) {
        iteratee(obj[i], i, obj);
      }
    }
  }

  // 创建is方法，判断变量类型，这里利用了Object.prototype.toString方法
  _.each(["Arguments", "Function", "String", "Number", "Date", "RegExp", "Error"], function (name) {
    _[`is${name}`] = function (obj) {
      return toString.call(obj) === `[object ${name}]`;
    };
  });

  _.isNaN = function (obj) {
    return _.isNumber(obj) && obj !== obj;
  }

  // 对象是否具有特定属性
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // 获取对象的自有属性(不包括原型链上的属性)
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if(nativeKeys) return nativeKeys(obj);
    let keys = [];
    for(let key in obj) if(_.has(obj, key)) keys.push(key);
    return keys;
  }
  
  // 获取对象的所有属性
  // for in 循环可以获取原型链上的所有属性
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    let keys = [];
    for(let key in obj) keys.push(key);
    return keys;
  }

  // 检查object中是否包含attrs中的键值对
  _.isMatch = function (object, attrs) {
    let keys = _.keys(attrs);
    if(object == null) return !length;
    let obj = Object(object);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if(attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  }

  _.extend = createAssigner(_.allKeys);

  _extendOwn = createAssigner(_.keys);

  _.matcher = function(attrs) {
    attrs = _extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  }

  _.property = function(key) {
    return function(obj) {
      return obj == null?void 0:obj[key];
    }
  }

  // 返回一个callback函数
  const cb = function (value, context, argCount) {
    // 如果value为null，callback作用是调用后直接返回传入的参数值
    if (value == null) {
      return _.identity;
    }
    // 如果value是一个函数，callback为可以改变context的回调函数
    if(_.isFunction(value)) return optimizeCb(value, context, argCount);
    // 如果value是一个对象（非函数），callback作用是判断对象是否包含value属性
    if(_.isObject(value)) return _.matcher(value);
    // 如果以上都不是，callback作用是传入一个属性value，返回对应的属性值
    return _.property(value);
  }

  _.identity = function(value) {
    return value;
  }

  // 类数组和对象都可以使用_.map方法
  // 如果iteratee参数传入的是一个对象，根据cb方法的定义
  // _.map的作用是判断数组obj中的是否包含iteratee对象
  // 并返回一个由boolean值组成的数组
  _.map = function (obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    let keys = !isArrayLike(obj) && _.keys(obj),
      length = keys || obj.length,
      result = Array(length);
    // 如果obj不是类数组，length等于由obj的属性名组成的数组（来自于_.keys(obj)）
    // 返回result为嵌套数组，内含有唯一元素length（数组）
    // 下面的循环不会运行
    for (let index = 0; index < length; index++) {
      let currentKey = keys ? key[index] : index;
      result[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return result;
  }

  _.reduce = createReduce(1);
  _.reduceRight = createReduce(-1);
  _.findIndex = createIndexFinder(1);
  _.findLastIndex = createIndexFinder(-1);

  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    let keys = _.keys(obj),
        key;
    for(let i=0; i<keys.length; i++) {
      key = keys[i];
      if(predicate(obj[key], key, obj)) return key;
    }
  }

  // 返回obj中第一个predicate返回值为true的元素（属性）
  _.find = function(obj, predicate, context) {
    let key;
    if(isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if(key !== void 0 && key !== -1) return obj[key];
  }

  _.filter = function(obj, predicate, context) {
    let result = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if(predicate(calue, index, list)) result.push(value);
    });
    return result;
  }

  // 反转predicate方法的返回值
  _.negate = function(predicate) {
    return function() {
      return !predcate.apply(this, arguments);
    }
  }

  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  }

  _.every = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    let keys = !isArrayLike(obj) && _.keys(obj),
        length = keys || obj.length;
    for(let index = 0; index < length; index++) {
      let currentKey = keys ? keys[index] : index;
      if(!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  }

  _.some = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    let keys = !isArrayLike(obj) && _.keys(obj);
        length = keys || obj.length;
    for(let index = 0; index < length; index++) {
      let currentKey = keys ? keys[index] : index;
      if(predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  }

  _.values = function(obj) {
    let keys = _.keys(obj),
        length = keys.length,
        values = Array(length);
    for(let i=0; i<length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  }

  // 在有序数组Array中找到obj插入的位置
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    let value = iteratee(obj),
        low = 0,
        high = array.length;
    // 二分法查值 
    while(low < high) {
      let mid = Math.floor((low + high) / 2);
      if(iteratee(array[mid]) < value) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  _.indexOf = function(array, item, isSorted) {
    let i = 0,
        length = array && array.length;
    if(typeof isSorted == "number") {
      // 定义查找起始位置index
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else if(isSorted && length) {
      i = _.sortedIndex(array, item);
      // 如果item应在的位置下标的元素不等于item，说明array中不包含item
      return array[i] === item ? i : -1;
    }
    // 判断item是否是NaN
    if(item !== item) {
      return _.findIndex(slice.call(array, i), _.isNaN);
    }
    // 无序array，遍历对比
    for(; i<length; i++) if(array[i] === item) return i;
  }

  _.contains = function(obj, target, fromIndex) {
    if(!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, (typeof fromIndex === "number" && fromIndex) >= 0);
  }

  // 对obj中每个元素执行method
  _.invoke = function(obj, method) {
    let args = slice.call(arguments, 2),
        isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      let fn = isFunc ? method : value[method];
      return fn == null ? fn : fn.apply(value, args);
    });
  }


}).call(this); // this 这里是全局变量，在node环境下是exports
