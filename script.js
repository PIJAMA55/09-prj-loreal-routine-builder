/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Track selected products by their id */
let selectedProducts = [];

/* Load selected products from localStorage */
function loadSelectedProductsFromStorage() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch {
      selectedProducts = [];
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProducts.some((p) => p.id === product.id) ? " selected" : ""
    }" 
         data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="product-description-btn" data-product-id="${
          product.id
        }">Show Description</button>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners for selection
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent selection if clicking the description button
      if (event.target.classList.contains("product-description-btn")) return;
      const productId = card.getAttribute("data-product-id");
      const product = products.find((p) => p.id == productId);

      // Toggle selection
      const alreadySelected = selectedProducts.some((p) => p.id === product.id);
      if (alreadySelected) {
        selectedProducts = selectedProducts.filter((p) => p.id !== product.id);
      } else {
        selectedProducts.push(product);
      }
      saveSelectedProductsToStorage();
      displayProducts(products); // Update grid highlight
      updateSelectedProductsList();
    });
  });

  // Add description button listeners
  const descBtns = productsContainer.querySelectorAll(
    ".product-description-btn"
  );
  descBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const productId = btn.getAttribute("data-product-id");
      const card = btn.closest(".product-card");
      const product = products.find((p) => p.id == productId);

      // If overlay already exists, remove it
      const existingOverlay = card.querySelector(
        ".product-description-overlay"
      );
      if (existingOverlay) {
        existingOverlay.remove();
        btn.textContent = "Show Description";
        return;
      }

      // Create overlay element
      const overlay = document.createElement("div");
      overlay.className = "product-description-overlay";
      overlay.innerHTML = `
        <strong>Description</strong>
        <p>${product.description}</p>
        <button class="product-description-btn-close">Close</button>
      `;
      card.appendChild(overlay);
      btn.textContent = "Hide Description";

      // Close button inside overlay
      overlay
        .querySelector(".product-description-btn-close")
        .addEventListener("click", (e) => {
          overlay.remove();
          btn.textContent = "Show Description";
          e.stopPropagation();
        });
    });
  });
}

/* Update the Selected Products section and add "Clear All" button */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    // Remove Clear All button if present
    const clearBtn = document.getElementById("clearSelectedBtn");
    if (clearBtn) clearBtn.remove();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
      <div class="selected-product-item">
        <span>${product.name}</span>
        <button class="selected-product-remove" data-index="${idx}" title="Remove">&times;</button>
      </div>
    `
    )
    .join("");

  // Add Clear All button if not present
  if (!document.getElementById("clearSelectedBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearSelectedBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.className = "generate-btn";
    clearBtn.style.marginTop = "10px";
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProductsToStorage();
      updateSelectedProductsList();
      loadProducts().then((products) => displayProducts(products));
    });
    selectedProductsList.parentElement.appendChild(clearBtn);
  }

  // Add remove button listeners
  const removeBtns = selectedProductsList.querySelectorAll(
    ".selected-product-remove"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-index"));
      selectedProducts.splice(idx, 1);
      saveSelectedProductsToStorage();
      // Re-render both grid and selected list
      loadProducts().then((products) => displayProducts(products));
      updateSelectedProductsList();
      e.stopPropagation();
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* This function sends selected products to OpenAI and displays the routine */
async function generateRoutineWithAI(products) {
  chatWindow.innerHTML = "Generating your routine...";

  // Add the selected products as a user message to the chat history
  chatHistory.push({
    role: "user",
    content: `Here are the selected products:\n${JSON.stringify(
      products,
      null,
      2
    )}\nPlease generate a step-by-step routine using these products.`,
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add the AI's response to the chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      chatWindow.innerHTML = `<strong>Your Personalized Routine:</strong><br><br>${data.choices[0].message.content}`;
    } else {
      chatWindow.innerHTML = "Sorry, something went wrong. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "Error connecting to OpenAI. Please check your API key or internet connection.";
  }
}

// When the "Generate Routine" button is clicked
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select at least one product to generate a routine.";
    return;
  }

  // Reset chat history for a new routine
  chatHistory = [
    {
      role: "system",
      content:
        "You are a helpful skincare and beauty advisor. Only answer questions about routines, skincare, haircare, makeup, fragrance, or the products shown. If asked about something else, politely say you can only help with beauty advice.",
    },
  ];

  const productsForAI = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  await generateRoutineWithAI(productsForAI);
});

// Chat form submission handler - sends follow-up questions to OpenAI
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Add user's question to chat history
  chatHistory.push({
    role: "user",
    content: userInput,
  });

  // Show loading message
  chatWindow.innerHTML = "Thinking...";

  const WorkerURL = `https://loreal-chatbot.pinedagustavo33.workers.dev/`;

  try {
    const response = await fetch(WorkerURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add AI's answer to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      // Display the full chat history in the chat window
      chatWindow.innerHTML = chatHistory
        .filter((msg) => msg.role !== "system")
        .map((msg) =>
          msg.role === "user"
            ? `<div><strong>You:</strong> ${msg.content}</div>`
            : `<div><strong>Advisor:</strong> ${msg.content}</div>`
        )
        .join("<hr>");
    } else {
      chatWindow.innerHTML = "Sorry, something went wrong. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "Error connecting to OpenAI. Please check your API key or internet connection.";
  }

  // Clear the input box
  document.getElementById("userInput").value = "";
});

// On page load, restore selected products from localStorage
loadSelectedProductsFromStorage();
updateSelectedProductsList();
