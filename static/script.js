document.addEventListener('DOMContentLoaded', () => {
  const getPriceBtn = document.getElementById('get-price-btn');
  const productInputSection = document.getElementById('product-input');
  const priceResultsSection = document.getElementById('price-results');
  const goBackBtn = document.getElementById('go-back-btn');
  const productForm = document.getElementById('product-form');
  const predictedPriceElement = document.getElementById('predicted-price');
  const priceRangeElement = document.getElementById('price-range');
  const confidenceLevelElement = document.getElementById('confidence-level');
  const originalPriceDisplay = document.getElementById('original-price-display');
  const closeFormBtn = document.getElementById('close-form-btn');
  const categoryDropdown = document.getElementById('main-category');
  const conditionOptions = document.getElementById('condition-options'); // The condition checkboxes container

  // Show product input section when "Get Price Prediction" button is clicked
  getPriceBtn.addEventListener('click', () => {
    document.getElementById('home').classList.add('hidden');
    productInputSection.classList.remove('hidden');
    productInputSection.scrollIntoView({ behavior: "smooth" });
  });

  // Close form and return to the home page
  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', () => {
      productInputSection.classList.add('hidden');
      document.getElementById('home')?.classList.remove('hidden');
      document.getElementById('home')?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Go back to the home page
  goBackBtn.addEventListener('click', () => {
    productInputSection.classList.add('hidden');
    priceResultsSection.classList.add('hidden');
    document.getElementById('home').classList.remove('hidden');
    document.getElementById('home').scrollIntoView({ behavior: "smooth" });
  });

  // Show condition options only for Electronics
  categoryDropdown.addEventListener('change', () => {
    const selectedCategory = categoryDropdown.value;

    if (selectedCategory === 'electronics') {
      conditionOptions.style.display = 'block';  // Show the condition options (radio buttons)
    } else {
      conditionOptions.style.display = 'none';  // Hide them for other categories
    }
  });

  // Handle form submission and call API
 // Handle form submission and pass the condition correctly
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const productName = document.getElementById('product-name').value;
  const originalPrice = parseFloat(document.getElementById('original-price').value);
  const mainCategory = document.getElementById('main-category').value;
  
  // Get the selected condition value, if it exists
  let condition = 'new';  // Default to 'new' if no condition is selected
  if (document.querySelector('input[name="condition"]:checked')) {
    condition = document.querySelector('input[name="condition"]:checked').value;
  }

  // Fetch current price data for the selected product from the backend for validation
  const productDataResponse = await fetch(`/get_product_data?q=${encodeURIComponent(productName)}`);
  const productData = await productDataResponse.json();

  if (productData.error) {
    alert(`Product not found: ${productData.error}`);
    return;
  }

  // Dynamically check if the entered price is too low or too high
  const productCurrentPrice = productData.current_price;
  const productOriginalPrice = productData.original_price;

  // Define reasonable bounds: let's say 50% to 150% of the current price as a valid range
  const minPrice = productCurrentPrice * 0.5;  // 50% lower than current price
  const maxPrice = productCurrentPrice * 1.5;  // 150% higher than current price

  // Check if the entered original price is within the reasonable range
  if (originalPrice < minPrice || originalPrice > maxPrice) {
    alert(`The entered price varies greatly from market price. Please enter a price between KSh ${minPrice.toFixed(2)} and KSh ${maxPrice.toFixed(2)} for this product.`);
    return;
  }

  const requestData = {
    product_name: productName,
    original_price: originalPrice,
    main_category: mainCategory,
    condition: condition
  };

  try {
    const response = await fetch('/predict_api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();

    if (result.error) {
      predictedPriceElement.textContent = `Error: ${result.error}`;
      priceRangeElement.textContent = '';
      confidenceLevelElement.textContent = '';
      originalPriceDisplay.textContent = '';
    } else {

      
      const productNameDisplay = document.getElementById('product-name-display');
      productNameDisplay.textContent = `Product Name: ${productName}`;
      predictedPriceElement.textContent = `Optimal Price: KSh ${result.prediction.toFixed(2)}`;
      priceRangeElement.textContent = `Market Price Range: KSh ${result.price_range.low.toFixed(2)} - KSh ${result.price_range.high.toFixed(2)}`;
      confidenceLevelElement.textContent = `Confidence Level: ${result.confidence}`;
      originalPriceDisplay.textContent = `Preferred Price: KSh ${originalPrice.toFixed(2)}`;
    }

    productInputSection.classList.add('hidden');
    priceResultsSection.classList.remove('hidden');
    priceResultsSection.scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    predictedPriceElement.textContent = `Request failed: ${error.message}`;
    priceRangeElement.textContent = '';
    confidenceLevelElement.textContent = '';
    originalPriceDisplay.textContent = '';
    priceResultsSection.classList.remove('hidden');
    priceResultsSection.scrollIntoView({ behavior: "smooth" });
  }
});


});
// --- Autocomplete for Product Name ---
const nameInput = document.getElementById('product-name');
const categorySelect = document.getElementById('main-category');
const searchResults = document.getElementById('search-results');

let debounceTimer = null;
nameInput.addEventListener('input', () => {
  const q = nameInput.value.trim();
  clearTimeout(debounceTimer);

  if (q.length < 2) {
    searchResults.innerHTML = '';
    return;
  }

  debounceTimer = setTimeout(async () => {
    const resp = await fetch(`/search?q=${encodeURIComponent(q)}`);
    const items = await resp.json();
    let html = '';
    items.forEach(it => {
      html += `
        <div class="suggestion" style="padding:.5rem; border:1px solid #eee; cursor:pointer;">
          <div><strong>${it.product_name}</strong></div>
          <div style="font-size:.9rem;color:#555">
            ${it.main_category} • Current: KSh ${it.current_price.toFixed(2)} • Original: KSh ${it.original_price.toFixed(2)}
          </div>
        </div>`;
    });
    searchResults.innerHTML = html;

    // Click to choose suggestion
    Array.from(searchResults.querySelectorAll('.suggestion')).forEach(el => {
      el.addEventListener('click', () => {
        const text = el.querySelector('strong').textContent;
        const meta = el.querySelector('div:nth-child(2)').textContent;
        nameInput.value = text;

        // try set category automatically
        const cat = meta.split('•')[0].trim();
        for (const opt of categorySelect.options) {
          if (opt.text.toLowerCase() === cat.toLowerCase() || opt.value.toLowerCase() === cat.toLowerCase()) {
            categorySelect.value = opt.value;
            break;
          }
        }

        searchResults.innerHTML = '';
      });
    });
  }, 180);
});

// Hamburger menu functionality
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
}

// Fetch the latest 4 predictions from the backend
fetch('/latest_predictions')
  .then(response => response.json())
  .then(data => {
    const predictionCards = document.getElementById('prediction-cards');
    
    // Clear previous content in case of any re-renders
    predictionCards.innerHTML = '';

    // Loop through the latest predictions and create a card for each
    data.forEach(product => {
      // Check if the necessary data exists to prevent empty cards
      if (product.input_data && product.prediction) {
        const card = document.createElement('div');
        card.classList.add('prediction-card');

        card.innerHTML = `
          <h3>${product.input_data.product_name}</h3>
          <p>Category: ${product.input_data.main_category || 'N/A'}</p>
          <p>Current Price: KSh ${product.input_data.original_price || 'N/A'}</p>
          <p>Predicted Price: KSh ${product.prediction.prediction || 'N/A'}</p>
          <p>Price Range: KSh ${product.prediction.price_range.low || 'N/A'} - KSh ${product.prediction.price_range.high || 'N/A'}</p>
          <p>Confidence: ${product.prediction.confidence || 'N/A'}</p>
          <button class="more-info-btn">More Info</button>
          <p class="timestamp" style="display:none;">Timestamp: ${product.timestamp || 'N/A'}</p> <!-- Hidden until clicked -->
        `;

        predictionCards.appendChild(card);
      }
    });

    // Event listener for More Info button
    const moreInfoButtons = document.querySelectorAll('.more-info-btn');
    moreInfoButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const timestampElement = event.target.closest('.prediction-card').querySelector('.timestamp');
        timestampElement.style.display = (timestampElement.style.display === 'block') ? 'none' : 'block';
      });
    });
    categorySelect.addEventListener('change', () => {
  const selectedCategory = categorySelect.value;

  if (selectedCategory === 'electronics') {
    document.getElementById('condition-options').style.display = 'block';  // Show the condition options (radio buttons)
  } else {
    document.getElementById('condition-options').style.display = 'none';  // Hide them for other categories
  }
});

  })


  .catch(error => console.log('Error fetching predictions:', error));
