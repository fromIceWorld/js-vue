**v-model**

版本:Vue@2.6.10

背景：在 compiler 篇已经描述了对模板的解析，经过: 1.parseStartTag  2.handleStartTag

3.start 4.closeElement 5.processElement 解析后，进入processAttrs函数，对指令进行解析，这篇只描述          v-model指令的解析。

```javascript
<input type='input' v-model='value'/>
```

最后获取的v-model的指令解析出的数据是:

```javascript
el = {
    type:1,
    tag:'input',
    attrsList:[{name:'v-model', value:'value'},{name:'type', value:'input'}],
    makeAttrsMap:{'v-model':'value','type':'input'}
}
进入processAttrs函数，只分析v-model，省略v-on /v-bind，因此源码简化。
```

**processAttrs**

```javascript
function processAttrs (el) {
    var list = el.attrsList;
    var i, l, name, rawName, value, modifiers, syncGen, isDynamic;
    for (i = 0, l = list.length; i < l; i++) {
      name = rawName = list[i].name;
      value = list[i].value;
      if (dirRE.test(name)) {     /^v-|^@|^:/
        // mark element as dynamic
        el.hasBindings = true;
        // modifiers
        modifiers = parseModifiers(name.replace(dirRE, ''));
        // support .foo shorthand syntax for the .prop modifier
        if (modifiers) {
          name = name.replace(modifierRE, '');
          name = name.replace(dirRE, '');  //   /^v-|^@|^:/
          addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
          if ( name === 'model') {
            checkForAliasModel(el, value);
          }
      } 
    }
  }
0- v-model指令 只走以上流程。    
1- 给节点添加hasBindings属性，解析出修饰符，获取真实name：model。
2- addDirective(el, name, 'v-model', value, undefined, false, modifiers, list[i]);    
```

**addDirective**

```javascript
  function addDirective (
    el,
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers,
    range
  ) {
    (el.directives || (el.directives = [])).push(rangeSetItem({
      name: name,
      rawName: rawName,
      value: value,
      arg: arg,
      isDynamicArg: isDynamicArg,
      modifiers: modifiers
    }, range));
    el.plain = false;
  }
0- 将解析出的指令数据添加到节点上。
1- el.directives = [{name, 'v-model', 'value', undefined, false, modifiers, list[i]}]
```

经过解析的节点，节点指令需要再经过 generate 中的genDirectives拼接成render函数。

**genDirectives**

```javascript
  function genDirectives (el, state) {
    var dirs = el.directives;
    if (!dirs) { return }
    var res = 'directives:[';
    var hasRuntime = false;
    var i, l, dir, needRuntime;
    for (i = 0, l = dirs.length; i < l; i++) {
      dir = dirs[i];
      needRuntime = true;
      var gen = state.directives[dir.name];
      if (gen) {
        // compile-time directive that manipulates AST.
        // returns true if it also needs a runtime counterpart.
        needRuntime = !!gen(el, dir, state.warn);
      }
      if (needRuntime) {
        hasRuntime = true;
        res += "{name:\"" + (dir.name) + "\",rawName:\"" + (dir.rawName) + "\"" + (dir.value ? (",value:(" + (dir.value) + "),expression:" + (JSON.stringify(dir.value))) : '') + (dir.arg ? (",arg:" + (dir.isDynamicArg ? dir.arg : ("\"" + (dir.arg) + "\""))) : '') + (dir.modifiers ? (",modifiers:" + (JSON.stringify(dir.modifiers))) : '') + "},";
      }
    }
    if (hasRuntime) {
      return res.slice(0, -1) + ']'
    }
  }
0- gen 会找到我们的基础指令函数 model
1- 
```

**model**

```javascript
  function model (
    el,
    dir,
    _warn
  ) {
    warn$1 = _warn;
    var value = dir.value;
    var modifiers = dir.modifiers;
    var tag = el.tag;
    var type = el.attrsMap.type;

    {
      // inputs with type="file" are read only and setting the input's
      // value will throw an error.
      if (tag === 'input' && type === 'file') {
        warn$1(
          "<" + (el.tag) + " v-model=\"" + value + "\" type=\"file\">:\n" +
          "File inputs are read only. Use a v-on:change listener instead.",
          el.rawAttrsMap['v-model']
        );
      }
    }

    if (el.component) {
      genComponentModel(el, value, modifiers);
      // component v-model doesn't need extra runtime
      return false
    } else if (tag === 'select') {
      genSelect(el, value, modifiers);
    } else if (tag === 'input' && type === 'checkbox') {
      genCheckboxModel(el, value, modifiers);
    } else if (tag === 'input' && type === 'radio') {
      genRadioModel(el, value, modifiers);
    } else if (tag === 'input' || tag === 'textarea') {
      genDefaultModel(el, value, modifiers);
    } else if (!config.isReservedTag(tag)) {
      genComponentModel(el, value, modifiers);
      // component v-model doesn't need extra runtime
      return false
    } else {
      warn$1(
        "<" + (el.tag) + " v-model=\"" + value + "\">: " +
        "v-model is not supported on this element type. " +
        'If you are working with contenteditable, it\'s recommended to ' +
        'wrap a library dedicated for that purpose inside a custom component.',
        el.rawAttrsMap['v-model']
      );
    }

    // ensure runtime directive metadata
    return true
  }
0- 经过tag 和 type 的限制，最后执行genDefaultModel(el, value, modifiers);
```

**genDefaultModel**

```javascript
  function genDefaultModel (
    el,
    value,
    modifiers
  ) {
    var type = el.attrsMap.type;

    // warn if v-bind:value conflicts with v-model
    // except for inputs with v-bind:type
    {
      var value$1 = el.attrsMap['v-bind:value'] || el.attrsMap[':value'];
      var typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type'];
      if (value$1 && !typeBinding) {
        var binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value';
        warn$1(
          binding + "=\"" + value$1 + "\" conflicts with v-model on the same element " +
          'because the latter already expands to a value binding internally',
          el.rawAttrsMap[binding]
        );
      }
    }

    var ref = modifiers || {};
    var lazy = ref.lazy;
    var number = ref.number;
    var trim = ref.trim;
    var needCompositionGuard = !lazy && type !== 'range';
    var event = lazy
      ? 'change'
      : type === 'range'
        ? RANGE_TOKEN
        : 'input';

    var valueExpression = '$event.target.value';
    if (trim) {
      valueExpression = "$event.target.value.trim()";
    }
    if (number) {
      valueExpression = "_n(" + valueExpression + ")";
    }
    var code = genAssignmentCode(value, valueExpression);
    if (needCompositionGuard) {
      code = "if($event.target.composing)return;" + code;
    }
    addProp(el, 'value', ("(" + value + ")"));
    addHandler(el, event, code, null, true);
    if (trim || number) {
      addHandler(el, 'blur', '$forceUpdate()');
    }
  }
0- v-model只支持三种修饰符，lazy/number/trim
1- v-model 绑定的值，根据lazy属性，当lazy为false时，event是'input',value会根据我们输入的值进行更新，    即使我们在输入法编辑器阶段的值也会更新到输入框；当lazy为true，event是'change',就不会为code添加
   'if($event.target.composing)return;'代码。只有输入框失去焦点才会触发'change'事件
2- 生成值表达式【输入的值】，根据 trim / number，修饰符对表达式进行包装处理，赋予修饰符所表达的能力。
3- genAssignmentCode是生成赋值表达式【过程在下面'a' + '=' + "_n($event.target.value.trim())"】
4- needCompositionGuard 对code进行控制。
5- 添加prop属性。prop:{value:(value)}
6- 添加事件
```

**$event.target.composing**

```javascript
el.addEventListener('compositionstart', onCompositionStart);
el.addEventListener('compositionend', onCompositionEnd);
  function onCompositionStart (e) {
    e.target.composing = true;
  }

  function onCompositionEnd (e) {
    // prevent triggering an input event for no reason
    if (!e.target.composing) { return }
    e.target.composing = false;
    trigger(e.target, 'input');
  }
0- 给输入框添加监听事件控制composing状态，当用户在输入法编辑阶段，为true，

```

**genAssignmentCode**

```javascript
  function genAssignmentCode (
    value,
    assignment   // "_n($event.target.value.trim())"
  ) {
    var res = parseModel(value);
    if (res.key === null) {
      return (value + "=" + assignment)
    } else {
      return ("$set(" + (res.exp) + ", " + (res.key) + ", " + assignment + ")")
    }
  }
0- 解析 value值的类型 a.b / a[b] / a
1- 返回不同的赋值方式
a      'a' + '=' + "_n($event.target.value.trim())"
a.b   "$set(a, b, "_n($event.target.value.trim())")"
```

**addHandler**

```javascript
addHandler 是对事件指令的处理，涉及修饰符(modifiers)的各种操作，但是我们的v-model指令的修饰符，已经被处理了，不需要走那些代码，因此代码简化为：
  function addHandler (
    el,
    name,   	// input / change
    value,  	// 'a' + '=' + "_n($event.target.value.trim())"
    modifiers,  // null
    important,  // true
    warn,       // null
    range,      // null
    dynamic     // null
  ) {
   
    var events;
    if (modifiers.native) {
      delete modifiers.native;
      events = el.nativeEvents || (el.nativeEvents = {});
    } else {
      events = el.events || (el.events = {});
    }

    var newHandler = rangeSetItem({ value: value.trim(), dynamic: dynamic }, range); // {value,dynamic}
  
    var handlers = events[name];
    /* istanbul ignore if */
    if (Array.isArray(handlers)) {
      important ? handlers.unshift(newHandler) : handlers.push(newHandler);
    } else if (handlers) {
      events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
    } else {
      events[name] = newHandler;
    }

    el.plain = false;
  }
最终添加的属性
el = {
    events:{
        'input':'a' + '=' + "_n($event.target.value.trim())"
    },
    plain:false
}
问题：为甚麽最终会在有trim/number 添加blur 事件 $forceUpdate()
```

