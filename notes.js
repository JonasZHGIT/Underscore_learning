(function() {
  // root 保存全局变量。
  const root = this;
  // 简写各种方法
  const objProto = Object.prototype;
  // Object.prototype.toString 方法会返回变量类型
  const toString = objProto.toString;
  const hasOwnProperty = objProto.hasOwnProperty;
  // 返回表示对象自身可枚举属性字符串的数组
  const nativeKeys = Object.keys;

  // 创建 _ 函数（构造函数？）
  let _ = function (obj) {
    if (obj instanceof _) {
      return obj;
    }
    if (!(this instanceof _)) {
      return new _(obj);
    }
    this._wrapped = obj;
  }

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

  // 函数也可以返回true；由于返回的是!!obj，null会返回为false
  _.isObject = function(obj) {
    let type = typeof obj;
    return type === "function" || type === "object" && !!obj;
  }

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


}).call(this); // this 这里是全局变量，在node环境下是exports
