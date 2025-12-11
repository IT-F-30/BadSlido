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