Here is the schema

```mermaid
erDiagram
    User {
        int _id
        string name
        string password
    }
    Meals {
        date date
        int nbPerson
        string description
    }
    Recipes {
        int _id
        string name
        image icon
        string description
        list ingredients_quantity_g
        list tags
    }
    Ingredients {
        int _id
        string name
        image icon
        string description
        list tags
    }
    User }o -- o{ Meals : plans
    Meals }o -- o{ Recipes : contains
    Recipes }o -- o{ Recipes : contains
    Recipes }o -- o{ Ingredients : contains
```
In MongoDB here an example of document for each collection:

User:
```json
{
    "_id": 1,
    "name": "Jane",
    "password": "secret"
}
```

Meals:
```json
{
    "date": 2025-09-16,
    "nbPerson": 2,
    "description":"dinner for 2"
}
```

Recipes:
```json
 {
    "_id": 1,
    "name": "",
    "description": "",
    "ingredients_quantity_g":[
        {
            "ingredient": 1,
            "quatity_g": 5
        }
    ],
    "tags":["vegetarian"]
}
```

Ingredients:
```json
 {
    "_id": 1,
    "name": "",
    "description": "",
    "ingredientsIds":[2],
    "tags":[]
}
```