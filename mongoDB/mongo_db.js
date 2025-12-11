db = db.getSiblingDB('db_badslido');

// Create collection with validation rules
db.createCollection('messages', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['word'],
            properties: {
                word: {
                    bsonType: 'string',
                    description: 'word must be a string and is required'
                }
            }
        }
    },
    validationAction: 'error'
});

db.createCollection('correlations', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['word'],
            properties: {
                word: {
                    bsonType: 'string',
<<<<<<< HEAD
                    description: 'word must be a string and is required'
=======
                    description: 'correlation must be a string and is required'
>>>>>>> 5583e6dd6f6a15723c8dca15691f638ac910d8c0
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