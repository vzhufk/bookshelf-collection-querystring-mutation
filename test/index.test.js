const bcqm = require("../src/index.js");

const bookshelf = require("bookshelf");
const knex = require("knex");
const sqlite3 = require("sqlite3");

const flatM = model => {
  return model.serialize().map(v => v.id);
};

const flatD = obj => {
  return obj.map(v => v.id);
};

describe("bookshelf-collection-query-mutation", () => {
  const db = new sqlite3.Database("./test/test.sqlite3");
  const repository = bookshelf(
    knex({
      client: "sqlite3",
      useNullAsDefault: true,
      connection: {
        filename: "./test/test.sqlite3"
      }
    })
  );

  repository.plugin(bcqm);

  const data = [
    { id: 1, name: "Eggs", price: 0.5, qty: 10, barcode: "EGG432141" },
    { id: 2, name: "Milk", price: 2.5, qty: 2, barcode: "MLK957212" },
    { id: 3, name: "Bread", price: 2, qty: 14, barcode: "BRD226943" },
    { id: 4, name: "Apple", price: 1, qty: 3, barcode: "APL230010" },
    { id: 5, name: "Banana", price: 1.5, qty: 22, barcode: "BNA715315" },
    { id: 6, name: "Spam", price: 5, qty: 7, barcode: "SPM239742" },
    { id: 7, name: "Salt", price: 2.78, qty: 1, barcode: "SLT110023" },
    { id: 8, name: "Fish", price: null }
  ];

  beforeAll(async () => {
    await repository.knex.schema.dropTableIfExists("shopping_list");
    await repository.knex.schema.createTable("shopping_list", table => {
      table.increments("id").primary();
      table.string("name");
      table.integer("qty");
      table.float("price");
      table.string("barcode");
    });
    await repository.knex("shopping_list").insert(data);
  });

  const List = repository.Model.extend({
    tableName: "shopping_list",
    allowed: ["name", "qty", "price"],
    hidden: ["barcode"]
  });

  const ListCollection = repository.Collection.extend({
    tableName: "shopping_list",
    allowed: ["name", "qty", "price"],
    hidden: ["barcode"]
  });

  describe("Model", () => {
    describe("filter", () => {
      test("select items qty >= 2", async () => {
        let items = new List();
        items.filter("qty ge 2");
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(flatD(data.filter(v => v.qty >= 2)));
      });

      test("select items price is null", async () => {
        let items = new List();
        items.filter(`price is null`);
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(flatD(data.filter(v => v.price === null)));
      });

      test("select items price is not null", async () => {
        let items = new List();
        items.filter(`price sn null`);
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(flatD(data.filter(v => v.price !== null)));
      });

      test("select items qty >= 2 and price >= 2", async () => {
        let items = new List();
        items.filter("qty ge 2 and price ge 2");
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(
          flatD(data.filter(v => v.qty >= 2 && v.price >= 2))
        );
      });

      test("select items that name in ['Eggs', 'Milk']", async () => {
        let items = await new List()
          .filter("name in ['Milk', 'Eggs']")
          .fetchAll();
        expect(flatM(items)).toEqual(
          flatD(data.filter(v => ["Milk", "Eggs"].includes(v.name)))
        );
      });

      test("select items (qty >= 2 and price >= 2) or name like Eggs", async () => {
        let items = new List();
        items.filter(`(qty ge 2 and price ge 2) or name lk "Eggs"`);
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data.filter(v => (v.qty >= 2 && v.price >= 2) || v.name == "Eggs")
          )
        );
      });

      test("select items ((qty >= 2 and price >= 2) or (qty < 2 and price < 2)) and price is not null", async () => {
        let items = new List();
        items.filter(
          `((qty ge 2 and price ge 2) or (qty lt 2 and price lt 2)) and price sn null`
        );
        items = await items.fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data.filter(
              v => (v.qty >= 2 && v.price >= 2) || (v.qty < 2 && v.price < 2)
            )
          )
        );
      });
    });

    describe("orderBy", () => {
      test("select all", async () => {
        let items = await new List().fetchAll();
        expect(flatM(items)).toEqual(flatD(data));
      });

      test("select all", async () => {
        let items = await new List().fetchAll();
        expect(flatM(items)).toEqual(flatD(data));
      });

      test("select items order by name", async () => {
        let items = await new List().orderBy("name").fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data.sort((a, b) =>
              a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            )
          )
        );
      });

      test("select items order by price", async () => {
        let items = await new List().orderBy("price").fetchAll();
        expect(flatM(items)).toEqual(
          flatD(data.sort((a, b) => a.price - b.price))
        );
      });

      test("select items order by qty", async () => {
        let items = await new List().orderBy("qty").fetchAll();
        expect(flatM(items)).toEqual(flatD(data.sort((a, b) => a.qty - b.qty)));
      });

      test("select one order by name, qty, price", async () => {
        let items = await new List().orderBy("name, qty, price").fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .sort((a, b) => a.price - b.price)
              .sort((a, b) => a.qty - b.qty)
              .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
          )
        );
      });
    });

    describe("filter and orderBy", () => {
      test("select items qty >= 2 orderBy price", async () => {
        let items = await new List()
          .filter("qty ge 2")
          .orderBy("price")
          .fetchAll();
        expect(flatM(items)).toEqual(
          flatD(data.filter(v => v.qty >= 2).sort((a, b) => a.price - b.price))
        );
      });

      test("select items qty >= 2 and price >= 2 orderBy price", async () => {
        let items = await new List()
          .filter("qty ge 2 and price ge 2")
          .orderBy("price")
          .fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .filter(v => v.qty >= 2 && v.price >= 2)
              .sort((a, b) => a.price - b.price)
          )
        );
      });

      test("select one price >= 2 orderBy name, price", async () => {
        let items = await new List()
          .filter("price ge 2")
          .orderBy("name, price")
          .fetchAll();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .filter(v => v.price >= 2)
              .sort((a, b) => a.price > b.price)
              .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
          )
        );
      });
    });

    describe("errors", () => {
      test("error", () => {
        expect(() => {
          throw new Error("Test.");
        }).toThrow("Test");
      });

      test("bad filter expression", () => {
        let items = new List();
        expect(() => items.filter("price 10")).toThrow(
          "Failed to parse to Logical Expression."
        );
      });

      test("bad filter operation in expression", () => {
        let items = new List();
        expect(() => items.filter("price le 10 and qty === 1")).toThrow(
          "'===' operation is not available."
        );
      });

      test("hidden filter property", () => {
        let items = new List();
        expect(() =>
          items.filter("price le 10 and barcode il EGG432141")
        ).toThrow("'barcode' is hidden in Model.");
      });

      test("not allowed filter property", () => {
        let items = new List();
        expect(() => items.filter("price le 10 and id ge 1")).toThrow(
          "'id' is not allowed in Model."
        );
      });

      test("hidden orderBy property", () => {
        let items = new List();
        expect(() => items.orderBy("price, barcode")).toThrow(
          "'barcode' is hidden in Model."
        );
      });

      test("not allowed orderBy property", () => {
        let items = new List();
        expect(() => items.orderBy("price, id")).toThrow(
          "'id' is not allowed in Model."
        );
      });
    });
  });

  describe("Collection", () => {
    // A bit strange work with
    describe("orderBy", () => {
      test("select items order by name", async () => {
        let items = await new ListCollection().orderBy("name").fetch();
        expect(flatM(items)).toEqual(
          flatD(
            data.sort((a, b) =>
              a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            )
          )
        );
      });

      test("select items order by price", async () => {
        let items = await new ListCollection().orderBy("price").fetch();
        expect(flatM(items)).toEqual(
          flatD(data.sort((a, b) => a.price - b.price))
        );
      });

      test("select items order by qty", async () => {
        let items = await new ListCollection().orderBy("qty").fetch();
        expect(flatM(items)).toEqual(flatD(data.sort((a, b) => a.qty - b.qty)));
      });

      test("select one order by name, qty, price", async () => {
        let items = await new ListCollection()
          .orderBy("name, qty, price")
          .fetch();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .sort((a, b) => a.price - b.price)
              .sort((a, b) => a.qty - b.qty)
              .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
          )
        );
      });
    });

    describe("filter and orderBy", () => {
      test("select items qty >= 2 orderBy price", async () => {
        let items = await new ListCollection()
          .filter("qty ge 2")
          .orderBy("price")
          .fetch();
        expect(flatM(items)).toEqual(
          flatD(data.filter(v => v.qty >= 2).sort((a, b) => a.price - b.price))
        );
      });

      test("select items qty >= 2 and price >= 2 orderBy price", async () => {
        let items = await new ListCollection()
          .filter("qty ge 2 and price ge 2")
          .orderBy("price")
          .fetch();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .filter(v => v.qty >= 2 && v.price >= 2)
              .sort((a, b) => a.price - b.price)
          )
        );
      });

      test("select one price >= 2 orderBy name, price", async () => {
        let items = await new ListCollection()
          .filter("price ge 2")
          .orderBy("name, price")
          .fetch();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .filter(v => v.price >= 2)
              .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
              .sort((a, b) => a.price - b.price)
          )
        );
      });

      test("select one price >= 2 and price is not null orderBy name, price", async () => {
        let items = await new ListCollection()
          .filter("price ge 2 and price sn null")
          .orderBy("name, price")
          .fetch();
        expect(flatM(items)).toEqual(
          flatD(
            data
              .filter(v => v.price >= 2 && v.price !== null)
              .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
              .sort((a, b) => a.price - b.price)
          )
        );
      });
    });

    describe("errors", () => {
      test("error", () => {
        expect(() => {
          throw new Error("Test.");
        }).toThrow("Test");
      });

      test("bad filter expression", () => {
        let items = new ListCollection();
        expect(() => items.filter("price 10")).toThrow(
          "Failed to parse to Logical Expression."
        );
      });

      test("bad filter operation in expression", () => {
        let items = new ListCollection();
        expect(() => items.filter("price le 10 and qty === 1")).toThrow(
          "'===' operation is not available."
        );
      });

      test("hidden filter property", () => {
        let items = new ListCollection();
        expect(() =>
          items.filter("price le 10 and barcode il EGG432141")
        ).toThrow("'barcode' is hidden in Model.");
      });

      test("not allowed filter property", () => {
        let items = new ListCollection();
        expect(() => items.filter("price le 10 and id ge 1")).toThrow(
          "'id' is not allowed in Model."
        );
      });

      test("hidden orderBy property", () => {
        let items = new ListCollection();
        expect(() => items.orderBy("price, barcode")).toThrow(
          "'barcode' is hidden in Model."
        );
      });

      test("not allowed orderBy property", () => {
        let items = new ListCollection();
        expect(() => items.orderBy("price, id")).toThrow(
          "'id' is not allowed in Model."
        );
      });

      test("not allowed values for is", () => {
        let items = new ListCollection();
        expect(() => items.filter("price is 1")).toThrow(
          "'1' cant be used for is/sn in Model."
        );
      });

      test("not allowed values for not is", () => {
        let items = new ListCollection();
        expect(() => items.filter("price sn 1")).toThrow(
          "'1' cant be used for is/sn in Model."
        );
      });
    });
  });
});
