(function() {
  // root 保存全局变量。
  const root = this;
  const previousUnderscore = root._;
  
  // 简写各种方法
  const objProto = Object.prototype,
        ArrayProto = Array.prototype,
        FuncProto = Function.prototype;

  // Object.prototype.toString 方法会返回变量类型
  const toString = objProto.toString,
        hasOwnProperty = objProto.hasOwnProperty,
        slice = ArrayProto.slice,
        push = ArrayProto.push;
  
  // Object.keys返回表示对象自身可枚举属性字符串的数组
  const nativeKeys = Object.keys,
        nativeCreate = Object.create,
        nativeBind = FuncProto.bind,
        nativeIsArray = Array.isArray;

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

  // 定义 CommonJS 方式加载模块
  // 定义浏览器环境全局变量 _
  if(typeof exports !== "undefined") {
    if(typeof module !== "undefined" && module.exports) exports = module.exports = _;
    exports._ = _;
  } else {
    root._ = _;
  }

  const Ctor = function(){};

  const MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  // 返回_的实例，实现链式语法
  _.chain = function (obj) {
    let instance = _(obj);
    instance._chain = true;
    return instance;
  }

  // 返回链式语法
  const result = function (instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  }

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
  
  _.prototype.value = function() {
    return this._wrapped;
  }
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
  _.prototype.toString = function() {
    return '' + this._wrapped;
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

  _.isArray = nativeIsArray || (function(obj) {
    return toString.call(obj) === "[object Array]";
  });
  
  // 创建is方法，判断变量类型，这里利用了Object.prototype.toString方法
  _.each(["Arguments", "Function", "String", "Number", "Date", "RegExp", "Error"], function (name) {
    _[`is${name}`] = function (obj) {
      return toString.call(obj) === `[object ${name}]`;
    };
  });

  _.each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function(name) {
    let method = ArrayProto[name];
    _.prototype[name] = function() {
      let obj = this._wrapped;
      method.apply(obj, arguments);
      // 解决IE关于shift和splice方法的bug
      if(name === "shift" || name === "splice" && obj.length === 0) delete obj[0];
      return result(this, obj);
    }
  });

  _.each(["concat", "join", "slice"], function(name) {
    let method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    }
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

  const group = function(behavior) {
    return function(obj, iteratee, context) {
      let result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        let key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    }
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

  // 检查obj（数组）中是否包含给定的属性值（元素）
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

  // 获取obj中各元素key属性的属性值，并返回由属性值组成的数组
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  }

  // 返回obj中包含attrs键值对的元素
  _.where = function(obj, attrs) {
    return _,filter(obj, _.matcher(attrs));
  }

  // 返回obj中第一个包含attrs键值对的元素
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  }

  _.max = function(obj, iteratee, context) {
    let result = -Infinity,
        lastComputed = - Infinity,
        value,
        computed;
    if(iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for(let i = 0; i < obj.length; i++) {
        value = obj[i];
        if(value > result) {
          resutl = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if(computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  _.min = function(obj, iteratee, context) {
    let result = Infinity,
        lastComputed = Infinity,
        value,
        computed;
    if(iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for(let i=0; i<obj.length; i++) {
        value = obj[i];
        if(value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if(computed < lastComputed || computed === Infinity && result === Inifnity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  _.random = function(min, max) {
    if(max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random()*(max-min+1));
  }
  
  // 随机打乱obj中元素的顺序
  _.shuffle = function(obj) {
    let set = isArrayLike(obj) ? obj : _values(obj),
        length = set.length,
        shuffled = Array(length),
        rand;
    for(let index=0; index<length; index++) {
      rand = _.random(0, index);
      if(rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  }

  // 从obj中随机取出n个元素返回新数组，没有给定参数n时返回单个元素
  _.sample = function(obj, n, guard) {
    if(n == null || guard) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  }

  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        critiria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      let a = left.criteria,
          b = right.criteria;
      if(a !== b) {
        if(a > b || a === void 0) return 1;
        if(a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), "value");
  }

  // 根据传入的参数给obj的元素分组，返回一个包含分组结果的对象
  _.groupBy = group(function(result, value, key) {
    if(_.has(result, key)) result[key].push(value);
    else result[key] = [value];
  });

  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  _.countBy = group(function(result, value, key) {
    if(_.has(result, key)) result[key]++;
    else result[key] = 1;
  });

  // slice方法无参数调用会将对象转化为数组
  _.toArray = function(obj) {
    if(!obj) return [];
    if(_.isArray(obj)) return slice.call(obj);
    if(isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  }

  _.size = function(obj) {
    if(obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  }

  // 给obj元素分组，一组是predicate结果为true的元素，另一组为false的元素
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    let pass = [],
        fail = [];
    _.each(obj, function(value, key, obj) {
      predicate(value, key, obj) ? pass.push(value) : fail.push(value);
    });
    return [pass, fail];
  }

  // 返回除了后面n个元素之外的其余元素数组
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  }

  // 返回前面n个元素数组
  _.first = function(array, n, guard) {
    if(array == null) return void 0;
    if(n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  }

  // 返回除了前面n个元素之外的其余元素数组
  _.rest = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  }

  // 返回后面n个元素数组
  _.last = function(array, n, guard) {
    if(array == null) return void 0;
    if(n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  }

  // 返回除去所有falsy项的数组
  _.compact = function(array) {
    return _.filter(array, _.identity);
  }

  // 嵌套数组展开
  const flatten = function (input, shallow, strict, startIndex) {
    let output = [],
      idx = 0;
    for (let i = startIndex || 0, length = input && input.length || 0; i < length; i++) {
      let value = input[i];
      if (isArrayLike(value) && _.isArray(value) || _.isArguments(value)) {
        if (!shallow) value = flatten(value, shallow, strict);
        let j = 0,
          len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++]
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  }

  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  }

  // 返回array中没在其余数组中出现的元素组成的新数组
  _.difference = function(array) {
    // 展开所有参数数组（除了指定的array之外， 还可以存在其他参数数组）
    let rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value) {
      return !_.contains(rest, value);
    })
  }

  // 返回array删除与其余参数相同元素后，由剩余元素组成的新数组
  _.without = function(array) {
    // slice.call(arguments, 1)作用是将除array之外的参数放入一个参数数组中
    return _.difference(array, slice.call(arguments, 1));
  }

  // 数组去重
  _.uniq = function(array, isSorted, iteratee, context) {
    if(array == null) return [];
    // isSorted 参数是可选项
    if(!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if(iteratee != null) iteratee = cb(iteratee, context);
    let result = [];
    // seen 数组是已存在的iteratee过的元素，与computed对应
    let seen = [];
    for(let i =0; i < array.length; i++) {
      let value = array[i],
          computed = iteratee ? iteratee(value, i , array) : value;
      // 如果array是已排序数组，则可以采用简单方法对比
      if(isSorted) {
        // 从第二个元素开始（第一个元素在一开始不存在重复的问题）
        // 或者判断当前值是否等于前一个值
        if(!i || seen !== computed) result.push(value);
        // seen等于上一个值
        seen = computed;
      }
      else if(iteratee) {
        if(!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) result.push(value);
    }
    return result;
  }

  // 返回所有参数数组的并集
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  }

  // 返回所有参数数组的交集
  _.intersection = function(array) {
    if(array == null) return [];
    let result = [],
        argsLength = arguments.length;
    for(let i = 0; i < array.length; i++) {
      let item = array[i];
      // 如果result中已经包括item元素（即重复），直接跳过这次循环
      if(_.contains(result, item)) continue;
      for(let j = 1; j < argsLength; j++) {
        if(!_.contains(arguments[j], item)) break;
      }
      // 判断是否j的全部循环都已经执行，全部执行说明所有数组参数中都包含item
      if(j === argsLength) result.push(item);
    }
    return result;
  }

  // 返回嵌套数组array转置后的新嵌套数组，传入参数只能是嵌套数组
  _.unzip = function(array) {
    // _.max(array, "length") 返回array中"length"属性值较大的元素
    let length = array && _.max(array, "length").length || 0;
    console.log(_.max(array, "length"));
    let result = Array(length);
    for(let index = 0; index < length; index++) {
      // _.pluck(array, index) 返回array数组每个元素index相同项组成的新数组（矩阵转置）
      result[index] = _.pluck(array, index);
    }
    return result;
  }

  // 与_.unzip功能相同，不同之处是传入的参数可以是多个数组
  _.zip = function() {
    return _.unzip(arguments);
  }

  // 将数组转换为对象
  _.object = function(list, values) {
    let result = {};
    for(let i = 0, length = list && list.length; i < length; i++) {
      if(values) result[list[i]] = value[i];
      else result[list[i][0]] = list[i][1];
    }
    return result;
  }

  // 反向查找数组中item项并返回索引
  // 与_.findLastIndex不同之处是后者可以传入iteratee方法
  _.lastIndexOf = function(array, item, from) {
    let idx = array ? array.length : 0;
    if(typeof from == "number") idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    // 如果item是NaN
    if(item !== item) return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
    while(--idx >= 0) if(array[idx] === item) return idx;
    return -1;
  }

  // 返回一个从start到stop的整数数组，step是步长
  _.range = function(start, stop, step = 1) {
    // 定义start为可选项
    if(arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    let length = Math.max(Math.ceil((stop - start) / step), 0);
    let range = Array(length);
    for(let idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    } 
    return range;
  }

  const executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if(!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    let self = baseCreate(sourceFunc.prototype);
    let result = sourceFunc.apply(self, args);
    if(_.isObject(result)) return result;
    return self;
  }

  _.bind = function(fn, context) {
    if(nativeBind && fn.bind === nativeBind) return nativeBind.apply(fn, slice.call(arguments, 1));
    if(!_.isFunction(fn)) throw new TypeError("Bind must be called on a function");
    let args = slice.call(arguments, 2);
    let bound = function() {
      return executeBound(fn, bound, context, this, args.concat(slice.call(arguments)));
    }
    return bound;
  }

  _.partial = function(fn) {
    let boundArgs = slice.call(arguments, 1);
    let bound = function() {
      let position = 0,
          length = boundArgs.length,
          args = Array(length);
      for(let i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while(position < arguments.length) args.push(arguments[position++]);
      return executeBound(fn, bound, this, this, args);
    }
    return bound;
  }

  // 绑定所有方法参数到obj上
  _.bindAll = function(obj) {
    let i,
        length = arguments.length,
        key;
    if(length <= 1) throw new Error("bindAll must be passed function names");
    for(i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  }

  _.memorize = function(fn, hasher) {
    let memorize = function(key) {
      let cache = memorize.cache;
      let address = '' + hasher ? hasher.apply(this, arguments) : key;
      if(!_.has(cache, address)) cache[address] = fn.apply(this, arguments);
      return cache[address];
    }
    memorize.cache = {};
    return memorize;
  }

  // 延迟执行函数并添加参数
  _.delay = function(fn, wait) {
    let args = slice.call(arguments, 2);
    return setTimeout(function() {
      // 全局调用fn方法
      return fn.apply(null, args);
    }, wait);
  }

  _.now = Date.now || function() {
    return new Date().getTime();
  }

  _.defer = _.partial(_.delay, _, 1);

  // 创建一个至少每wait时间执行一次的fn函数
  _.throttle = function(fn, wait, options) {
    let context,
        args,
        result;
    let timeout = null;
    let previous = 0;
    if(!options) options = {};
    let later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = fn.apply(context, args);
      if(!timeout) context = args = null;
    }
    return function() {
      let now = _.now();
      if(!previous && options.leading === false) previous = now;
      let remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if(remaining <= 0 || remaining > wait) {
        if(timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = fn.apply(context, args);
        if(!timeout) context = args = null;
      } else if(!timeout && options.trailing !== false) timeout = setTimeout(later, remaining);
      return result;
    }
  }

  // 创建在wait时间间隔只能执行一次的fn函数
  _.debounce = function(fn, wait, immediate) {
    let tiemout,
        args,
        context,
        timestamp,
        result;
    let later = function() {
      let last = _.now() - timestamp;
      if(last < wait && last >= 0) timeout = setTimeout(later, wait - last);
      else {
        timeout = null;
        if(!immediate) {
          result = fn.apply(context, args);
          if(!timeout) context = args = null;
        }
      }
    }
    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      let callNow = immediate && !timeout;
      if(!timeout) timeout = setTimeout(later, wait);
      if(callNow) {
        result = fn.apply(context, args);
        context = args = null;
      }
      return result;
    }
  }

  // 将fn作为参数封装到wrapper函数中
  _.wrap = function(fn, wrapper) {
    return _.partial(wrapper, fn);
  }

  // 创建复合函数
  // 最后一个参数函数执行后，将返回的结果作为前一个参数函数的参数继续执行
  _.compose = function() {
    let args = arguments;
    let start = args.length - 1;
    return function() {
      let i = start;
      let result = args[start].apply(this, arguments);
      while(i--) result = args[i].call(this, result);
      return result;
    }
  }

  // 调用times次数之后才运行fn函数
  // 第一次调用之后，参数times存入内存
  _.after = function(times, fn) {
    return function() {
      if(--times < 1) {
        return fn.apply(this, arguments);
      }
    }
  }

  // 创建只能运行小于times次数的fn函数
  _.before = function(times, fn) {
    let memo;
    return function() {
      if(--times > 0) {
        memo = fn.apply(this, arguments);
      }
      if(times <= 1) fn = null;
      return memo;
    }
  }

  // 创建只能运行一次的函数
  _.once = _.partial(_.before, 2);

  // _.map方法的对象版本
  _.mapObject = function(obj, iteratee, context) {
  iteratee = cb(iteratee, context);
    let keys = _.keys(obj),
        length = keys.length,
        result = {},
        currentKey;
    for(let index = 0; index < length; index++) {
      currentKey = keys[index];
      result[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return result;
  }

  // 把obj对象转换成键值对组成的嵌套数组
  _.pairs = function(obj) {
    let keys = _.keys(obj);
    let length = keys.length;
    let pairs = Array(length);
    for(let i = 0; i < length; i++) pairs[i] = [keys[i], obj[keys[i]]];
    return pairs;
  }

  // 对调obj对象的键值对
  _.invert = function(obj) {
    let result = {};
    let keys = _.keys(obj);
    for(let i = 0; i < keys.length; i++) result[obj[keys[i]]] = keys[i];
    return result;
  }

  // 返回对象obj所有方法名组成的有序数组
  _.functions = function(obj) {
    let names = [];
    for(let key in obj) {
      if(_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  }

  // _.filter方法的对象版本
  _.pick = function(object, oiteratee, context) {
    let result = {},
        obj = object;
        iteratee,
        keys;
    if(obj == null) return result;
    if(_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) {
        return key in obj;
      }
      obj = Object(obj);
    }
    for(let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let value = obj[key];
      if(iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  }

  // _.reject方法的对象版本
  _.omit = function(obj, iteratee, context) {
    if(_.isFunction(iteratee)) iteratee = _.negate(iteratee);
    else {
      let keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      }
    }
    return _.pich(obj, iteratee, context);
  }

  // 与_.extend方法作用相同
  // 不同之处是如果原对象中包括了同属性名的键值对，将不会覆盖原属性
  // 而_.extend方法会覆盖同名属性
  // createAssigner方法第二个参数的区别
  _.defaults = createAssigner(_.allKeys, true);

  // 创建包含props属性的继承prototype的函数实例
  _.create = function(prototype, props) {
    let result = baseCreate(prototype);
    if(props) _.extendOwn(result, props);
    return result;
  }

  // 克隆一个obj
  _.clone = function(obj) {
    if(!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  }

  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  }

  // 比较方法是先比较基本类型，如string，number等，排除特殊类型
  // 对于数组和对象类型，利用递归深度遍历内部数据
  // 利用比较基本类型的方法继续比较内部内部元素直到全部相同或不相同
  const eq = function(a, b, aStack, bStack) {
    // 排除 0 === -0 的情况， 0 和 -0 不视为相等
    if(a === b) return a !== 0 || 1 / a === 1/ b;
    // 排除 null == undefined 的情况
    if(a == null || b == null) return a === b;
    if(a instanceof _) a = a._wrapped;
    if(b instanceof _) b = b._wrapped;
    let className = toString.call(a);
    // 如果a和b的类型不同，可以确定a和b不相等
    if(className !== toString.call(b)) return false;
    switch(className) {
      case "[object RegExp]":
      case "[object String]":
        return '' + a === '' + b;
      case "[object Number]":
      // 判断NaN情况 NaN !== NaN, 但应视为相同
        if(+a !== +a) return +b !== +b;
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case "[object Date]":
      case "[object Boolean]":
        return +a === +b;
    }
    let areArrays = className === "[object Array]";
    if(!areArrays) {
      if(typeof a != "object" || typeof b != "object") return false;
      let aCtor = a.constructor,
          bCtor = b.constructor;
      // 如果构造函数不相同，则a和b不相同
      if(aCtor !== bCtor && !((_.isFunction(aCtor) && aCtor instanceof aCtor) && (_.isFunction(bCtor) && bCtor instanceof bCtor)) && ("constructor" in a && "constructor" in b)) return false;
    }
    aStack = aStack || [];
    bStack = bStack || [];
    let length = aStack.length;
    while(length--) {
      if(aStack[length] === a) return bStack[length] === b;
    }
    aStack.push(a);
    bStack.push(b);
    if(areArrays) {
      length = a.length;
      if(length !== b.length) return false;
      while(length--) {
        // 递归深度遍历对象
        if(!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      let keys = _.keys(a),
          key;
      length = keys.length;
      if(_.keys(b).length != length) return false;
      while(length--) {
        key = keys[length];
        if(!_.has(b, key) && eq(a[key], b[key], aStack, bStack)) return false;
      }
    }
    aStack.pop();
    bStack.pop();
    return true;
  }

  _.isEqual = function(a, b) {
    return eq(a, b);
  }

  _.isEmpty = function(obj) {
    if(obj == null) return true;
    if(isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  }

  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  }

  _isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  }

  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  }

  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === "[object Boolean]";
  }

  _.isNull = function(obj) {
    return obj === null;
  }

  _.isUndefined = function(obj) {
    return obj === void 0;
  }

  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  }

  _.constant = function(value) {
    return function() {
      return value;
    }
  }

  // 类似_.property，参数顺序不同
  _.propertyOf = function(obj) {
    return obj == null ? function() {} : function(key) {
      return obj[key];
    }
  }

  // 运行n次iteratee函数，并返回由函数返回值组成的数组
  _.times = function(n, iteratee, context) {
    let accm = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context);
    for(let i = 0; i < n; i++) accum[i] = iteratee[i];
    return accum;
  }

  const escapeMap = {
    "&": "&amp",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#x27;",
    "`": "&#x60;",
  }

  const unescapeMap = _.invert(escapeMap);

  const createEscaper = function(map) {
    let escaper = function(match) {
      return map[match];
    }
    let source = "(?:" + _.keys(map).join("|") + ")";
    let testRegexp = RegExp(source);
    let replaceRegexp = RegExp(source, "g");
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    }
  }

  _.escape = createEscaper(escapeMap);

  _.unescape = createEscaper(unescapeMap);

  _.result = function(object, property, fallback) {
    let value = object == null ? void 0 : object[property];
    if(value === void 0) value = fallback;
    // 如果property是方法名，则运行object.property()
    // 如果property是属性名，则返回属性值
    return _.isFunction(value) ? value.call(object) : value;
  }

  let idCounter = 0;
  // 生成全局唯一的id
  // 如果有prefix参数则为id增加prefix前缀
  _.uniqueId = function(prefix) {
    let id = ++idCounter + '';
    return prefix ? prefix + id : id;
  }

  // 将obj中的方法混入到_.prototype中
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      let fn = _[name] = obj[name];
      _.prototype[name] = function() {
        let args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, fn.apply(_, args));
      }
    })
  }

  _.mixin(_);

  // 定义 AMD 方式加载模块
  if(typeof define === "function" && define.amd) {
    define("underscore", [], function() {
      return _;
    });
  }

}).call(this); // this 这里是全局变量，在node环境下是exports
