const bcqm = require("../src/index.js");

const bookshelf = require("bookshelf");
const knex = require("knex");
const sqlite3 = require("sqlite3");

describe("bookshelf-collection-query-mutation", () => {
  const db = new sqlite3.Database("./test.sqlite3");
  const repository = bookshelf(
    knex({
      client: "sqlite3",
      useNullAsDefault: true,
      connection: {
        filename: "./test.sqlite3"
      }
    })
  );

  repository.plugin(bcqm);

  const data = [
    { id: 1, name: "Eggs", price: 0.5, qty: 10 },
    { id: 2, name: "Milk", price: 2.5, qty: 2 },
    { id: 3, name: "Bread", price: 2, qty: 1 },
    { id: 4, name: "Apple", price: 1, qty: 3 },
    { id: 5, name: "Banana", price: 1.5, qty: 2 },
    { id: 6, name: "Spam", price: 5, qty: 1 },
    { id: 7, name: "Salt", price: 2.78, qty: 1 }
  ];

  beforeAll(async () => {
    await repository.knex.schema.dropTableIfExists("shopping_list");
    await repository.knex.schema.createTable("shopping_list", table => {
      table.increments("id").primary();
      table.string("name");
      table.integer("qty");
      table.float("price");
    });
    await repository.knex("shopping_list").insert(data);
  });

  const List = repository.Model.extend({
    tableName: "shopping_list"
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
  });

  describe("orderBy", () => {
    test("select one", async () => {
      let items = await List.forge().fetch();
      expect(items.get("id")).toBe(data[0].id);
    });
  });
});
