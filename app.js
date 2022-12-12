const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running on http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DE Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();
const isStatusPropertyValid = (request, response) => {
  response.status(400);
  response.send("Invalid Todo Status");
};

const isPriorityPropertyValid = (request, response) => {
  response.status(400);
  response.send("Invalid Todo Priority");
};

const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
const priorityValues = ["HIGH", "MEDIUM", "LOW"];
const categoryValues = ["WORK", "HOME", "LEARNING"];
//get todos
const hasStatusProperty = (requestQuery) => {
  if (statusValues.includes(requestQuery.status)) {
    return true;
  } else {
    isStatusPropertyValid();
  }
};
const hasPriorityProperty = (requestQuery) => {
  if (priorityValues.includes(requestQuery.priority)) {
    return true;
  } else {
    isPriorityPropertyValid();
  }
};
const hasPriorityAndStatusProperty = (requestQuery) => {
  if (
    priorityValues.includes(requestQuery.priority) &&
    statusValues.includes(requestQuery.status)
  ) {
    return true;
  }
};
const hasCategoryAndStatus = (requestQuery) => {
  if (
    categoryValues.includes(requestQuery.category) &&
    statusValues.includes(requestQuery.status)
  ) {
    return true;
  }
};
const hasCategoryProperty = (requestQuery) => {
  if (categoryValues.includes(requestQuery.category)) {
    return true;
  }
};
const hasCategoryAndPriority = (requestQuery) => {
  if (
    categoryValues.includes(requestQuery.category) &&
    priorityValues.includes(requestQuery.priority)
  ) {
    return true;
  }
};

app.get("/todos/", async (request, response) => {
  const { status, priority, search_q = "", category } = request.query;
  let data = null;
  let getTodoDetails = "";

  switch (true) {
    case hasStatusProperty(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE status = '${status}';
        `;
      break;
    case hasPriorityProperty(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE priority = '${priority}';
        `;
      break;
    case hasPriorityAndStatusProperty(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE status = '${status}' AND priority = '${priority}';
        `;
      break;
    case hasCategoryAndStatus(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE category = '${category}' AND status = '${status}';
        `;
      break;
    case hasCategoryProperty(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE category = '${category}';
        `;
      break;
    case hasCategoryAndPriority(request.query):
      getTodoDetails = `
        SELECT * FROM todo WHERE category = '${category}' AND '${priority}';
        `;
      break;
    default:
      getTodoDetails = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%';
        `;
      break;
  }

  data = await db.all(getTodoDetails);
  response.send(data);
});

//get todo by todoId
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoDetails = `
    SELECT id,todo,priority, status, category, due_date AS dueDate
     FROM todo WHERE id = ${todoId};
    `;
  const data = await db.get(getTodoDetails);
  response.send(data);
});

//get todos with specific due dates
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isValidDate = isValid(new Date(date));
    if (isValidDate) {
      const formatDate = format(new Date(date), "yyyy-MM-dd");
      const getQuery = `
         SELECT id, todo, priority, status, category, due_date AS dueDate
         FROM todo
         WHERE due_date = '${formatDate}';
         `;
      const dbResponse = await db.all(getQuery);
      response.send(dbResponse);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//post todo
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postQuery = `
    INSERT INTO todo(id, todo, status, category, due_date)
    VALUES (
     ${id},
     '${todo}',
      '${status}',
        '${category}',
        '${dueDate}'
    );
    `;
  await db.run(postQuery);
  response.send("Todo Successfully Added");
});

//update todo
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn = "";
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    default:
      updateColumn = "Due Date";
  }

  const previousTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const {
    status = previousTodoQuery.status,
    priority = previousTodoQuery.priority,
    todo = previousTodoQuery.todo,
    category = previousTodoQuery.category,
    dueDate = previousTodoQuery.due_date,
  } = requestBody;
  const updatedQuery = `
  UPDATE todo
  SET todo = '${todo}',
  status = '${status}';
  priority = '${priority}',
  category = '${category}',
  due_date = '${dueDate}'
  WHERE id = ${todoId};
  `;

  await db.run(updatedQuery);
  response.send(`${updateColumn} Updated`);
});

//delete todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `
    DELETE FROM todo
    WHERE id = ${todoId};
    `;
  await db.run(deleteTodo);
  response.send("Todo Deleted");
});

module.exports = app;
