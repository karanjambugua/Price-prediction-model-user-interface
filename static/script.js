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
    const category = document.getElementById('category').value;
    const brand = document.getElementById('brand').value;
    const material = document.getElementById('material').value;
    const size = parseFloat(document.getElementById('size').value);
    const condition = document.querySelector('input[name="condition"]:checked').value;
    const targetPrice = parseFloat(document.getElementById('target-price').value);
    const location = document.getElementById('location').value;

    // Build request body
    const requestData = {
      product_name: productName,
      category: category,
      brand: brand,
      material: material,
      size: size,
      condition: condition,
      target_price: targetPrice,
      location: location
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
});
