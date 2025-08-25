// CRUD operations for categories table
const db = require("../db");

const oracledb = require("oracledb");

// Create Category
exports.createCategory = async (req, res) => {
  const { category_name, description } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `INSERT INTO categories (category_id, category_name, description) VALUES (categories_seq.NEXTVAL, :category_name, :description) RETURNING category_id INTO :id`,
      {
        category_name,
        description,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    if (connection.commit) await connection.commit();
    res
      .status(201)
      .json({ category_id: result.outBinds.id[0], category_name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Get All Categories
exports.getCategories = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute("SELECT * FROM categories", {});
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [columns[i], v]))
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Get Category by ID
exports.getCategoryById = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "SELECT * FROM categories WHERE category_id = :id",
      { id: req.params.id }
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Category not found" });
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = Object.fromEntries(
      result.rows[0].map((v, i) => [columns[i], v])
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  const { category_name, description } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "UPDATE categories SET category_name = :category_name, description = :description WHERE category_id = :id",
      { category_name, description, id: req.params.id }
    );
    if (connection.commit) await connection.commit();
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "DELETE FROM categories WHERE category_id = :id",
      { id: req.params.id }
    );
    if (connection.commit) await connection.commit();
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
