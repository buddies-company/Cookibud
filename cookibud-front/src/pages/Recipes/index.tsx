import { Container, Heading, StackedList, Card, Button } from "@soilhat/react-components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callApi } from "../../services/api";

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const navigate = useNavigate();

  const addRecipe=()=>{
    navigate("/recipes/new")
  }

  useEffect(() => {
    callApi("/recipes")
      .then((res) => setRecipes(res.data))
      .catch((error) => console.error("Error fetching recipes:", error));
  }, []);

  return (
    <Container>
      <Heading title="Recipes"><Button onClick={addRecipe}>New Recipe</Button></Heading>
      <StackedList onEmptyClick={addRecipe} emptyMessage="No recipes found. Click to add a new recipe.">
        {recipes.length>0 && recipes.map((recipe: any) => (
          <Card className="cursor-pointer" key={recipe.id} onClick={()=> navigate(`/recipes/${recipe.id}`)}>
            <Card.Body>{recipe.title} </Card.Body>
          </Card>
        ))}
      </StackedList>
    </Container>
  );
}