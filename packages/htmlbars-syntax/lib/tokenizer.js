import { Tokenizer } from "../simple-html-tokenizer";
import { isHelper } from "./utils";
import builders from "./builders";

Tokenizer.prototype.createAttribute = function(char) {
  if (this.token.type === 'EndTag') {
    throw new Error('Invalid end tag: closing tag must not have attributes, in ' + formatTokenInfo(this) + '.');
  }
  this.currentAttribute = builders.attr(char.toLowerCase(), [], null);
  this.token.attributes.push(this.currentAttribute);
  this.state = 'attributeName';
};

Tokenizer.prototype.markAttributeQuoted = function(value) {
  this.currentAttribute.quoted = value;
};

Tokenizer.prototype.addToAttributeName = function(char) {
  this.currentAttribute.name += char;
};

Tokenizer.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute.value;

  if (!this.currentAttribute.quoted && char === '/') {
    throw new Error("A space is required between an unquoted attribute value and `/`, in " + formatTokenInfo(this) +
                    '.');
  }
  if (!this.currentAttribute.quoted && value.length > 0 &&
      (char.type === 'MustacheStatement' || value[0].type === 'MustacheStatement')) {
    throw new Error("Unquoted attribute value must be a single string or mustache (on line " + this.line + ")");
  }

  if (typeof char === 'object') {
    if (char.type === 'MustacheStatement') {
      value.push(char);
    } else {
      throw new Error("Unsupported node in attribute value: " + char.type);
    }
  } else {
    if (value.length > 0 && value[value.length - 1].type === 'TextNode') {
      value[value.length - 1].chars += char;
    } else {
      value.push(builders.text(char));
    }
  }
};

Tokenizer.prototype.finalizeAttributeValue = function() {
  if (this.currentAttribute) {
    this.currentAttribute.value = prepareAttributeValue(this.currentAttribute);
    delete this.currentAttribute.quoted;
    delete this.currentAttribute;
  }
};

Tokenizer.prototype.addTagHelper = function(helper) {
  var helpers = this.token.helpers = this.token.helpers || [];
  helpers.push(helper);
};

function prepareAttributeValue(attr) {
  var parts = attr.value;
  if (parts.length === 0) {
    return builders.text('');
  } else if (parts.length === 1 && parts[0].type === "TextNode") {
    return parts[0];
  } else if (!attr.quoted) {
    return parts[0];
  } else {
    return builders.concat(parts.map(prepareConcatPart));
  }
}

function prepareConcatPart(node) {
  switch (node.type) {
    case 'TextNode': return builders.string(node.chars);
    case 'MustacheStatement': return unwrapMustache(node);
    default:
      throw new Error("Unsupported node in quoted attribute value: " + node.type);
  }
}

function formatTokenInfo(tokenizer) {
  return '`' + tokenizer.token.tagName + '` (on line ' + tokenizer.line + ')';
}

export function unwrapMustache(mustache) {
  if (isHelper(mustache.sexpr)) {
    return mustache.sexpr;
  } else {
    return mustache.sexpr.path;
  }
}

export { Tokenizer };
