document.addEventListener('DOMContentLoaded', () => {
  const getPriceBtn = document.getElementById('get-price-btn');
  const productInputSection = document.getElementById('product-input');
  const priceResultsSection = document.getElementById('price-results');
  const goBackBtn = document.getElementById('go-back-btn');
  const productForm = document.getElementById('product-form');
  const predictedPriceElement = document.getElementById('predicted-price');
  const priceRangeElement = document.getElementById('price-range');
  const confidenceLevelElement = document.getElementById('confidence-level');
  const closeFormBtn = document.getElementById('close-form-btn');

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

  // Handle form submission and call API
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect values from the form
    const productName = document.getElementById('product-name').value;
    const originalPrice = parseFloat(document.getElementById('original-price').value);
    const targetPrice = parseFloat(document.getElementById('target-price').value);
    const mainCategory = document.getElementById('main-category').value; // Main Category Dropdown
    const condition = document.querySelector('input[name="condition"]:checked').value; // Condition (New, Used, Refurbished)

    // Build request body with relevant fields
    const requestData = {
      product_name: productName,
      original_price: originalPrice,
      target_price: targetPrice,
      main_category: mainCategory,
      condition: condition
    };

    try {
      // Send POST request to /predict_api
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
      } else {
        const predictedPrice = result.prediction.toFixed(2);
        const priceRange = `$${(predictedPrice - 10).toFixed(2)} - $${(parseFloat(predictedPrice) + 10).toFixed(2)}`;
        const confidenceLevel = "95%";  // Optional: change or compute dynamically if needed

        predictedPriceElement.textContent = `Predicted Price: $${predictedPrice}`;
        priceRangeElement.textContent = `Price Range: ${priceRange}`;
        confidenceLevelElement.textContent = `Confidence Level: ${confidenceLevel}`;
      }

      // Hide input and scroll to results
      productInputSection.classList.add('hidden');
      priceResultsSection.classList.remove('hidden');
      priceResultsSection.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
      predictedPriceElement.textContent = `Request failed: ${error.message}`;
      priceRangeElement.textContent = '';
      confidenceLevelElement.textContent = '';
      priceResultsSection.classList.remove('hidden');
      priceResultsSection.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Hamburger menu functionality
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }
});
