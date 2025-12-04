# 🍳 Cookibud: Your Meal Planner

Cookibud is a comprehensive meal planning tool designed to simplify the management of your personal recipes, the organization of your weekly menus, and the automatic generation of shopping lists.

## ✨ Key Features

Cookibud is built around three core pillars to optimize your time in the kitchen and at the store:
- 📚 Personal Recipes Management: Create, store, and manage your own extensive library of recipes.
- 🗓️ Detailed Meal Planning: Organize your recipes day by day, specifying the number of servings required for each dish.
- 🛒 Intelligent Grocery List Generator: Automatically generate a consolidated shopping list for a given date range, based on the ingredients and portions in your meal plan.

## 🛠️ Technical Stack

This project utilizes a modular and modern architecture to ensure performance and scalability.

| Component | Technology | Language | Role |
| --------- | ---------- | -------- | ---- |
| Frontend | React | JavaScript |Reactive and intuitive user interface (cookibud-front).|
| Backend | FastAPI | Python | Fast and asynchronous API to manage business logic (cookibud-api). |
| Database | MongoDB | NoSQL | Flexible storage for recipes, meal plans, and user data. |
| Containerization | Docker / Docker Compose | YAML | Consistent and portable development and deployment environment.|

## 🚀 Getting Started (For Developers)

Cookibud uses Docker Compose to easily orchestrate the three services (Frontend, Backend, Database).

### Prerequisites

Ensure you have the following installed on your machine:
- Docker
- Docker Compose
- Node.js / npm
- Python (3.11)


#### 1. Environment Variable Configuration

Create a .env files to define the necessary environment variables:

--- For npm private packages (inside cookibud-front) ---
```
GITHUB_TOKEN=your_github_token_here
```

--- For API Configuration (inside cookibud-api)---
```
MONGO_URI=mongodb://mongodb:27017/cookibud_db
```

#### 2. Launching with Docker Compose

Start the entire application with a single command:

```bash
# To build images and start containers
docker-compose up --build
```

| Service | Access | Description |
| ------- | ------ | ----------- |
| front | http://localhost:5173 | The React application (User Interface). |
| api | http://localhost:8000 | The FastAPI Backend API |
| mongo | mongodb://mongo:27017/cookibud | The database with a mounted volume to keep consistency |

#### 3. Accessing API Documentation

The FastAPI framework automatically generates interactive documentation:
- Swagger Docs (OpenAPI) : http://localhost:8000/docs
- Redoc Docs : http://localhost:8000/redoc

## 🤝 Contributing

We welcome all contributions! If you would like to improve Cookibud:
1. Fork the project.
2. Create a feature branch (git checkout -b feature/AmazingFeature).
3. Commit your changes (git commit -m 'Add some AmazingFeature').
4. Push to the branch (git push origin feature/AmazingFeature).
5. Open a Pull Request clearly describing your modifications.

## 📧 Contact

For any questions or suggestions, feel free to open an issue.

License: MIT