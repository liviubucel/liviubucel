import { execSync } from "child_process";

const PROJECT_ID = "8atrdwjk";
const DATASET = "production";
const TOKEN = "skhSbfwhqC6JYYN4IkNIjz4iPJRPKCAQsmI6xVm8IzKEHNCqHb7fic2G64RfiZiPeBcxUUAjhyX0fPUiF6TLme8wW6lX3qNJsqbUXZdhsFa0dVbstmXQ2UzJcs3lBWmOl5CuAmzllDOoiX0o0rtf3MIswf6DbrvvpG0epaxmIyRGuq6m2wkT";
const API_URL_QUERY = `https://${PROJECT_ID}.api.sanity.io/v2024-03-15/data/query/${DATASET}`;
const API_URL_MUTATE = `https://${PROJECT_ID}.api.sanity.io/v2024-03-15/data/mutate/${DATASET}`;

async function fixSanityData() {
  console.log("Fetching all posts and projects...");
  const query = encodeURIComponent('*[_type in ["post", "project"]] { _id, _type, published, language }');
  const res = await fetch(`${API_URL_QUERY}?query=${query}`);
  const data = await res.json();
  const docs = data.result;

  const mutations = [];
  
  for (const doc of docs) {
    const patches = {};
    if (doc.published === undefined || doc.published === null) {
      patches.published = true;
    }
    if (!doc.language) {
      patches.language = "en";
    }
    
    if (Object.keys(patches).length > 0) {
      mutations.push({
        patch: {
          id: doc._id,
          set: patches
        }
      });
    }
  }

  if (mutations.length === 0) {
    console.log("No documents need fixing.");
    return;
  }

  console.log(`Applying ${mutations.length} mutations...`);
  const mutateRes = await fetch(API_URL_MUTATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  
  const result = await mutateRes.json();
  if (!mutateRes.ok) {
    console.error("Mutation failed:", result);
  } else {
    console.log("Successfully fixed all Sanity documents!");
  }
}

fixSanityData().catch(console.error);
