const jsep = require("jsep");

const FILTER_OPERATORS = {
  eq: "=",
  ne: "!=",
  gt: ">",
  ge: ">=",
  lt: "<",
  le: "<=",
  lk: "like",
  il: "ilike"
};
for (let i in FILTER_OPERATORS) {
  jsep.addBinaryOp(i, 6);
}

const ORDER_DIRECTION = {
  desc: "DESC",
  asc: "ASC"
};

const _ = require("lodash"),
  Crypto = require("crypto"),
  CryptoUtil = require("./crypto-util");

/**
 * Export the plugin.
 */
export default (Bookshelf, options) => {
  const Model = Bookshelf.Model.prototype;
  Bookshelf.Model = Bookshelf.Model.extend({
    filter(expression) {
      if (!expression) {
        return this;
      }

      // Replacing proper logical operations
      expression = expression.replace(/ and /g, " && ");
      expression = expression.replace(/ or /g, " || ");
      const props = this.props;
      const hidden = this.hidden;

      function split(node) {
        if (node.type === "BinaryExpression") {
          let field = node.left.name;
          let operation = FILTER_OPERATORS[node.operator];
          let value = node.right.value;

          if (!props.includes(field)) {
            throw new QueryParseError(
              "No such property `" + field + "` to filter."
            );
          }

          if (hidden.includes(field)) {
            throw new QueryParseError("Property `" + field + "` is private.");
          }

          if (!operation) {
            throw new QueryParseError("This operation is not available.");
          }

          return qb => {
            qb.where(field, operation, value);
          };
        } else if (node.type === "LogicalExpression") {
          return qb => {
            qb.where(split(node.left));
            if (node.operator === "&&") {
              qb.andWhere(split(node.right));
            } else if (node.operator === "||") {
              qb.orWhere(split(node.right));
            }
          };
        } else {
          throw new QueryParseError("Failed to parse to Logical Expression.");
        }
      }

      let tree = jsep(expression);

      return this.query(split(tree));
    },

    order(expression) {
      if (!expression) {
        return this;
      }
      const props = this.props;
      const hidden = this.hidden;
      expression = expression.split(", ");
      for (let part of expression) {
        part = part.split(" ");
        let field = part[0];
        if (!props.includes(field)) {
          throw new QueryParseError(
            "No such property `" + field + "` to orderBy."
          );
        }

        if (hidden.includes(field)) {
          throw new QueryParseError("Property `" + field + "` is private.");
        }

        let direction =
          (part[1] && ORDER_DIRECTION[part[1]]) || ORDER_DIRECTION.asc;
        this.query(qb => qb.orderBy(field, direction));
      }
      return this;
    }
  });
};
