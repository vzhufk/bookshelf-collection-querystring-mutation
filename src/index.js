const jsep = require("jsep");

const ORDER_DIRECTION = {
  desc: "DESC",
  asc: "ASC"
};

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

//JSEP pre config (I dont even know do I need it)
for (let i in FILTER_OPERATORS) {
  jsep.addBinaryOp(i, 6);
}

/**
 * Export the plugin.
 */
const bcqm = (
  Bookshelf,
  options = {
    filterName: "filter",
    orderByName: "orderBy",
    hiddenPropsName: "hidden",
    allowedPropsName: "allowed",
    ignoreErrors: false
  }
) => {
  const Model = Bookshelf.Model.prototype;
  Bookshelf.Model = Bookshelf.Model.extend({
    [options.filterName]: function(expression) {
      if (!expression) {
        return this;
      }

      // Replacing proper logical operations
      expression = expression.replace(/ and /g, " && ");
      expression = expression.replace(/ or /g, " || ");

      const allowed = this[options.allowedPropsName];
      const hidden = this[options.hiddenPropsName];

      function split(node) {
        try {
          if (node.type === "BinaryExpression") {
            let field = node.left.name;
            let operation = FILTER_OPERATORS[node.operator];
            let value = node.right.value;

            if (!operation) {
              throw new Error(`'${node.operator}' operation is not available.`);
            }

            if (hidden && hidden.includes(field)) {
              throw new Error(`'${field}' is hidden in Model.`);
            }

            if (allowed && !allowed.includes(field)) {
              throw new Error(`'${field}' is not allowed in Model.`);
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
            throw new Error(`Failed to parse to Logical Expression.`);
          }
        } catch (e) {
          if (!options.ignoreErrors) {
            throw e;
          }
        }
      }

      let tree = jsep(expression);

      return this.query(split(tree));
    },

    [options.orderByName]: function(expression) {
      if (!expression) {
        return this;
      }
      const allowed = this[options.allowedPropsName];
      const hidden = this[options.hiddenPropsName];

      expression = expression.split(", ");

      for (let part of expression) {
        try {
          part = part.split(" ");
          let field = part[0];
          let direction =
            (part[1] && ORDER_DIRECTION[part[1]]) || ORDER_DIRECTION.asc;

          if (hidden && hidden.includes(field)) {
            throw new Error(`'${field}' is hidden in Model.`);
          }

          if (allowed && !allowed.includes(field)) {
            throw new Error(`'${field}' is not allowed in Model.`);
          }

          this.query(qb => qb.orderBy(field, direction));
        } catch (e) {
          if (!options.ignoreErrors) {
            throw e;
          }
        }
      }
      return this;
    }
  });
};

module.exports = bcqm;
