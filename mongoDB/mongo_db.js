db = db.getSiblingDB('db_todo');

db.todos.insertMany([
    { word: 'Next.js', weight: 42 },
    { word: 'React', weight: 38 },
    { word: 'MongoDB', weight: 35 },
    { word: 'Bun', weight: 30 },
    { word: 'Docker', weight: 28 },
    { word: 'TypeScript', weight: 25 },
    { word: 'SSR', weight: 22 },
]);
