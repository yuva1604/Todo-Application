const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dateFns = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertTodoDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const toCheckValidQuery = (request, response, next) => {
  const { category, priority, status, date } = request.query;
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const isDateValid = dateFns.isValid(new Date(date));
  if (category && !categoryValues.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityValues.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusValues.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else {
    next();
  }
};

const toCheckValidBody = (request, response, next) => {
  const { category, priority, status, dueDate } = request.body;
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const isDateValid = dateFns.isValid(new Date(dueDate));
  if (category && !categoryValues.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityValues.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusValues.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (dueDate && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

app.get("/todos/", toCheckValidQuery, async (request, response) => {
  const { status, priority, search_q, category } = request.query;
  const todoConditions = [
    search_q ? `todo LIKE '%${search_q}%'` : null,
    status ? `status = '${status}'` : null,
    priority ? `priority = '${priority}'` : null,
    category ? `category = '${category}'` : null,
  ];
  const conditionSet = todoConditions
    .filter((element) => element)
    .join(" AND ");
  const getTodosQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      ${conditionSet}
    `;
  const todosArray = await db.all(getTodosQuery);
  response.send(
    todosArray.map((eachTodo) => convertTodoDbObjectToResponseObject(eachTodo))
  );
});

app.get("/todos/:todoId", toCheckValidQuery, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const todo = await db.get(getTodoQuery);
  response.send(convertTodoDbObjectToResponseObject(todo));
});

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    let dateSet = dateFns.format(new Date(date), "yyyy-MM-dd");
    const getQuery = `SELECT * FROM todo
    WHERE due_date = '${dateSet}';`;
    console.log(getQuery);
    const data = await db.all(getQuery);
    response.send(
      data.map((eachmap) => ({
        id: eachmap.id,
        todo: eachmap.todo,
        priority: eachmap.priority,
        category: eachmap.category,
        status: eachmap.status,
        dueDate: eachmap.due_date,
      }))
    );
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", toCheckValidBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let date = dateFns.format(new Date(dueDate), "yyyy-MM-dd");
  const addTodoQuery = `
    INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES 
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${date}');
    `;
  const dbResponse = await db.run(addTodoQuery);
  console.log(dbResponse);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", toCheckValidBody, async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  const updateTodoQuery = `
    UPDATE todo SET 
    ${
      todo
        ? `todo='${todo}'`
        : priority
        ? `priority='${priority}'`
        : status
        ? `status='${status}'`
        : category
        ? `category='${category}'`
        : dueDate
        ? `due_date='${dueDate}'`
        : ""
    }
    WHERE id=${todoId};
    `;
  await db.run(updateTodoQuery);
  response.send(
    `${
      todo
        ? "Todo"
        : priority
        ? "Priority"
        : status
        ? "Status"
        : category
        ? "Category"
        : dueDate
        ? "Due Date"
        : ""
    } Updated`
  );
});

app.delete("/todos/:todoId/", toCheckValidQuery, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id = ${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
