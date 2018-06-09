const bcqm = require("../src/index.js");

const bookshelf = require("bookshelf");
const knex = require("knex");
const sqlite3 = require("sqlite3");

const fs = require("fs");

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
    { id: 3, name: "Bread", price: 2, qty: 1, barcode: "BRD226943" },
    { id: 4, name: "Apple", price: 1, qty: 3, barcode: "APL230010" },
    { id: 5, name: "Banana", price: 1.5, qty: 2, barcode: "BNA715315" },
    { id: 6, name: "Spam", price: 5, qty: 1, barcode: "SPM239742" },
    { id: 7, name: "Salt", price: 2.78, qty: 1, barcode: "SLT110023" }
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

  describe("filter", () => {
    test("select all", async () => {
      let items = await List.forge().count();
      expect(items).toBe(data.length);
    });

    test("select items qty >= 2", async () => {
      let items = List.forge();
      items.filter("qty ge 2");
      items = await items.count();
      expect(items).toBe(data.filter(v => v.qty >= 2).length);
    });

    test("select items qty >= 2 and price >= 2", async () => {
      let items = List.forge();
      items.filter("qty ge 2 and price ge 2");
      items = await items.count();
      expect(items).toBe(data.filter(v => v.qty >= 2 && v.price >= 2).length);
    });

    test("select items (qty >= 2 and price >= 2) or name like Eggs", async () => {
      let items = List.forge();
      items.filter(`(qty ge 2 and price ge 2) or name lk "Eggs"`);
      items = await items.count();
      expect(items).toBe(
        data.filter(v => (v.qty >= 2 && v.price >= 2) || v.name == "Eggs")
          .length
      );
    });

    test("select items (qty >= 2 and price >= 2) or (qty < 2 and price < 2)", async () => {
      let items = List.forge();
      items.filter(`(qty ge 2 and price ge 2) or (qty lt 2 and price lt 2)`);
      items = await items.count();
      expect(items).toBe(
        data.filter(
          v => (v.qty >= 2 && v.price >= 2) || (v.qty < 2 && v.price < 2)
        ).length
      );
    });
  });

  describe("orderBy", () => {
    test("select one", async () => {
      let items = await List.forge().fetch();
      expect(items.get("id")).toBe(data[0].id);
    });

    test("select one order by name", async () => {
      let items = await List.forge()
        .orderBy("name")
        .fetch();
      expect(items.get("name")).toBe(
        data.sort((a, b) => a.name > b.name)[0].name
      );
    });

    test("select one order by price", async () => {
      let items = await List.forge()
        .orderBy("price")
        .fetch();
      expect(items.get("price")).toBe(
        data.sort((a, b) => a.price > b.price)[0].price
      );
    });

    test("select one order by qty", async () => {
      let items = await List.forge()
        .orderBy("qty")
        .fetch();
      expect(items.get("qty")).toBe(data.sort((a, b) => a.qty > b.qty)[0].qty);
    });

    test("select one order by name, qty, price", async () => {
      let items = await List.forge()
        .orderBy("name, qty, price")
        .fetch();
      expect(items.get("id")).toBe(
        data
          .sort((a, b) => a.price > b.price)
          .sort((a, b) => a.qty > b.qty)
          .sort((a, b) => a.name > b.name)[0].id
      );
    });
  });

  describe("filter and orderBy", () => {
    test("select one qty >= 2 orderBy price", async () => {
      let items = await new List()
        .filter("qty ge 2")
        .orderBy("price")
        .fetch();
      expect(items.get("id")).toBe(
        data.filter(v => v.qty >= 2).sort((a, b) => a.price > b.price)[0].id
      );
    });

    test("select one qty >= 2 and price >= 2 orderBy price", async () => {
      let items = await new List()
        .filter("qty ge 2 and price ge 2")
        .orderBy("price")
        .fetch();
      expect(items.get("id")).toBe(
        data
          .filter(v => v.qty >= 2 && v.price >= 2)
          .sort((a, b) => a.price > b.price)[0].id
      );
    });

    test("select one price >= 2 orderBy name, price", async () => {
      let items = await new List()
        .filter("price ge 2")
        .orderBy("name, price")
        .fetch();
      expect(items.get("id")).toBe(
        data
          .filter(v => v.price >= 2)
          .sort((a, b) => a.price > b.price)
          .sort((a, b) => a.name > b.name)[0].id
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
