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
    const mainCategory = document.getElementById('main-category').value;
    const condition = document.querySelector('input[name="condition"]:checked').value;

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
        predictedPriceElement.textContent = `Predicted Price: KSh ${result.prediction.toFixed(2)}`;
        priceRangeElement.textContent = `Price Range: KSh ${result.price_range.low.toFixed(2)} - KSh ${result.price_range.high.toFixed(2)}`;
        confidenceLevelElement.textContent = `Confidence Level: ${result.confidence}`;
        originalPriceDisplay.textContent = `Original Price: KSh ${originalPrice.toFixed(2)}`;
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
});
