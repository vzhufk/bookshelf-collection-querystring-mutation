# Bookshelf Collection Querystring Mutation Plugin

This Bookshelf plugin allows you to filter and sort your bookshelf instances directly from URL query string parameters.
Using [jsep](https://www.npmjs.com/package/jsep) to parse query string logical expressions into QueryBuilder query.

Inspired by [Microsoft API Guideline Collections](https://github.com/Microsoft/api-guidelines/blob/vNext/Guidelines.md#9-collectionsMS).

## Instalation

```sh
$ npm install bookshelf-collection-querystring-mutation
```

## Basic Usage

```javascript
const express = require("express");
const bookshelf = require("bookshelf");
const knex = require("knex");

const bcqm = reqire("bookshelf-collection-querystring-mutation");

const repository = bookshelf(
  knex({
    /*...*/
  })
);

let app = express();

// Connect Plugin
repository.plugin(bcqm);

// Define Model
const List = repository.Model.extend({
  tableName: "shopping_list",
  allowed: ["name", "qty", "price"],
  hidden: ["barcode"]
});

app.get("/list", function(req, res, next) {
  let items = new List();

  // Mutate from query
  items.filter(req.query.filter).orderBy(req.query.orderBy);

  items.fetchAll().then(r => {
    /* Do stuff. */
  });
});
```

## How to use

```http
GET /list?filter=price ge 10&orderBy=name
```

Will filter instances that have `price >= 10` and order them by `name`.

## Filter Operation

Allows you to filter collection.

Pattern: `field1 <operation> value [logical_opration] ...`

| Operator             | Description           | Example                                               |
| -------------------- | --------------------- | ----------------------------------------------------- |
| Comparison Operators |                       |
| eq                   | Equal                 | city eq 'Redmond'                                     |
| ne                   | Not equal             | city ne 'London'                                      |
| gt                   | Greater than          | price gt 20                                           |
| ge                   | Greater than or equal | price ge 10                                           |
| lt                   | Less than             | price lt 20                                           |
| le                   | Less than or equal    | price le 100                                          |
| lk                   | Like                  | name lk "%gg%"                                        |
| il                   | iLike                 | name il "%GG%"                                        |
| Logical Operators    |                       |
| and                  | Logical and           | price le 200 and price gt 3.5                         |
| or                   | Logical or            | price le 3.5 or price gt 200                          |
| Grouping Operators   |                       |
| ( )                  | Precedence grouping   | (priority eq 1 or city eq 'Redmond') and price gt 100 |

## Filter examples:

The following examples illustrate the use and semantics of each of the logical operators.

Example: all products with a name equal to 'Milk'

```http
GET /list?filter=name eq 'Milk'
```

Example: all products with a name not equal to 'Milk'

```http
GET /list?filter=name ne 'Milk'
```

Example: all products with the name 'Milk' that also has a price less than 2.55:

```http
GET /list?filter=name eq 'Milk' and price lt 2.55
```

Example: all products that either have the name 'Milk' or have a price less than 2.55:

```http
GET /list?filter=name eq 'Milk' or price lt 2.55
```

Example: all products that have the name 'Milk' or 'Eggs' and have a price less than 2.55:

```http
GET /list?filter=(name eq 'Milk' or name eq 'Eggs') and price lt 2.55
```

Example: all products that have the name matching '_gg_':

```http
GET /list?filter=name lk "%gg%"
```

## OrderBy

Allows you to sort collections.

Pattern: `field1 [dirrection(asc|desc)][, field2 [dirrection(asc|desc)], [...]]`

## OrderBy Examples

Example: will return all products sorted by name in ascending order.

```http
GET /list?orderBy=name
```

For example: will return all products sorted by name in descending order.

```http
GET /list?orderBy=name desc
```

Sub-sorts can be specified by a comma-separated list of property names with OPTIONAL direction qualifier.

Example: will return all people sorted by name in descending order and a secondary sort order of price in ascending order.

```http
GET /list?orderBy=name desc,price
```

## Plugin Configuration:

```js
repository.plugin(bcqm, {
  filterName: "filter", //filter function name in BSModel
  orderByName: "orderBy", //orderBy function name in BSModel
  hiddenPropsName: "hidden", //name of Property that provides array of hidden fields
  allowedPropsName: "allowed", //name of Property that provides array of allowed fields
  ignoreErrors: false //throw errors or skip silently
});
```

Hidden and Allowed arrays provide fields visibility for a plugin.
If any filter or orderBy field is an array of private fields, it will throw an Error.
If any filter or orderBy field is not an array of allowed fields, it will throw an Error.

You can also not provide this props if you don't care.

Model example:

```js
const List = repository.Model.extend({
  tableName: "shopping_list",
  allowed: ["name", "qty", "price"], //filter and orderBy by this fields
  hidden: ["barcode"] //DON'T by this
});
```

# TODO:

- `not` Logical operator
