import { Container, Heading, StackedList, Card, Button } from "@soilhat/react-components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callApi, getApiUrl } from "../../services/api";
import type { IRecipe } from "./types";

export default function Recipes() {
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const navigate = useNavigate();

  const addRecipe=()=>{
    navigate("/recipes/new")
  }

  useEffect(() => {
    callApi<IRecipe[]>("/recipes")
      .then((res) => setRecipes(res.data))
      .catch((error) => console.error("Error fetching recipes:", error));
  }, []);

  return (
    <Container>
      <Heading title="Recipes"><Button onClick={addRecipe}>New Recipe</Button></Heading>
      <StackedList onEmptyClick={addRecipe} emptyMessage="No recipes found. Click to add a new recipe.">
        {recipes.length>0 && recipes.map((recipe: IRecipe) => (
          <Card className="cursor-pointer" key={recipe.id} onClick={()=> navigate(`/recipes/${recipe.id}`)}>
            <Card.Header>
          <img src={recipe.image_url? getApiUrl(recipe.image_url): "/assets/placeholder_recipe.png"} alt={recipe.title || "Recipe image"} className="w-full h-64 object-contain mb-4 rounded-lg" /></Card.Header>
            <Card.Body>{recipe.title} </Card.Body>
          </Card>
        ))}
      </StackedList>
    </Container>
  );
}