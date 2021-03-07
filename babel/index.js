const fs = require("fs"),
  babelParser = require("@babel/parser"),
  traverse = require("@babel/traverse").default,
  type = require("@babel/types"),
  generator = require("@babel/generator").default;

let content = fs.readFileSync(`${__dirname}/module1.js`),
  result = babelParser.parse(content.toString(), { sourceType: "module" });
traverse(result, {
  enter(path) {
    if (type.isMemberExpression(path.node)) {
      const objName = path.node.object.name,
        propertyName = path.node.property.name;
      if (objName == "module" && propertyName == "exports") {
        path.parent.right.properties[0].value.name = "c";
      }
    }
  },
});
result = generator(result);
fs.writeFileSync(`${__dirname}/module2.js`, result.code);
