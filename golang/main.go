package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Message struct {
	ID   primitive.ObjectID `bson:"_id,omitempty"`
	Word string             `bson:"word"`
}

type Correlation struct {
	ID     primitive.ObjectID `bson:"_id,omitempty"`
	Word   string             `bson:"word"`
	Weight int32              `bson:"weight"`
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func printAllMessages(collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Printf("Error fetching messages: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var messages []Message
	if err := cursor.All(ctx, &messages); err != nil {
		log.Printf("Error decoding messages: %v", err)
		return
	}

	fmt.Println("[Messages]")
	for _, msg := range messages {
		fmt.Printf("%s:%s\n", msg.ID.Hex(), msg.Word)
	}
	fmt.Println()
}

func printAllCorrelations(collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Printf("Error fetching correlations: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var correlations []Correlation
	if err := cursor.All(ctx, &correlations); err != nil {
		log.Printf("Error decoding correlations: %v", err)
		return
	}

	fmt.Println("[Correlations]")
	for _, corr := range correlations {
		fmt.Printf("%s:%s,%d\n", corr.ID.Hex(), corr.Word, corr.Weight)
	}
	fmt.Println()
}

func addToCorrelations(correlationsCollection *mongo.Collection, word string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Generate random weight between 1 and 100
	weight := int32(rand.Intn(100) + 1)

	correlation := Correlation{
		Word:   word,
		Weight: weight,
	}

	result, err := correlationsCollection.InsertOne(ctx, correlation)
	if err != nil {
		log.Printf("Error inserting into correlations: %v", err)
		return
	}

	log.Printf("Added to correlations: %s (weight: %d, id: %v)", word, weight, result.InsertedID)
}

func main() {
	mongoURI := getEnv("MONGODB_URI", "mongodb://root:password@db:27017/db_badslido?authSource=admin")
	dbName := getEnv("MONGODB_DB", "db_badslido")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting from MongoDB: %v", err)
		}
	}()

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}
	log.Println("Connected to MongoDB successfully")

	messagesCollection := client.Database(dbName).Collection("messages")
	correlationsCollection := client.Database(dbName).Collection("correlations")

	// Print initial messages and correlations
	printAllMessages(messagesCollection)
	printAllCorrelations(correlationsCollection)

	// Watch for changes in messages collection
	log.Println("Watching for changes in messages collection...")

	for {
		watchCtx := context.Background()
		changeStream, err := messagesCollection.Watch(watchCtx, mongo.Pipeline{})
		if err != nil {
			log.Printf("Error creating change stream: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		for changeStream.Next(watchCtx) {
			var changeEvent bson.M
			if err := changeStream.Decode(&changeEvent); err != nil {
				log.Printf("Error decoding change event: %v", err)
				continue
			}

			operationType := changeEvent["operationType"].(string)
			log.Printf("Change detected: %s", operationType)

			// If insert operation, add the word to correlations
			if operationType == "insert" {
				if fullDocument, ok := changeEvent["fullDocument"].(bson.M); ok {
					if word, ok := fullDocument["word"].(string); ok {
						addToCorrelations(correlationsCollection, word)
					}
				}
			}

			// Print all messages and correlations when any change occurs
			printAllMessages(messagesCollection)
			printAllCorrelations(correlationsCollection)
		}

		if err := changeStream.Err(); err != nil {
			log.Printf("Change stream error: %v", err)
		}
		changeStream.Close(watchCtx)

		log.Println("Change stream closed, reconnecting...")
		time.Sleep(2 * time.Second)
	}
}
