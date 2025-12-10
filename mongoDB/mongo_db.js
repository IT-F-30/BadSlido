db = db.getSiblingDB('batlido');

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
            required: ['correlation'],
            properties: {
                correlation: {
                    bsonType: 'string',
                    description: 'correlation must be a string and is required'
                }
            }
        }
    },
    validationAction: 'error'
});