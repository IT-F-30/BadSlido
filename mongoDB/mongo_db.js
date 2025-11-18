db = db.getSiblingDB('db_todo');

db.todos.insertMany([
    { word: 'Todo', weight: 1, color: 'black' }
]);
