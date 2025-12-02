db = db.getSiblingDB('db_todo');

// Create collection with validation rules
db.createCollection('todos', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['word', 'weight'],
            properties: {
                word: {
                    bsonType: 'string',
                    description: 'word must be a string and is required'
                },
                weight: {
                    bsonType: 'int',
                    minimum: 1,
                    maximum: 100,
                    description: 'weight must be an integer between 1 and 100'
                }
            }
        }
    },
    validationAction: 'error'
});

db.todos.insertMany([
    { word: 'React', weight: 10 },
    { word: 'Next.js', weight: 8 },
    { word: 'TypeScript', weight: 8 },
    { word: 'MongoDB', weight: 6 },
    { word: 'Docker', weight: 5 }
]);
