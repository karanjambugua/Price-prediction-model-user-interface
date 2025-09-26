from flask import Flask, request, jsonify, render_template
import joblib
import pandas as pd
import json
from datetime import datetime

app = Flask(__name__)

# Load the trained pipeline (includes preprocessing + model)
model = joblib.load('random_forest_model.joblib')

# Function to save prediction data to a JSON file
def save_prediction_to_file(input_data, prediction_data):
    # Combine input data with prediction results
    data_to_store = {
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "input_data": input_data,
        "prediction": prediction_data
    }
    
    # Append to JSON file
    with open('predictions.json', 'a') as file:
        json.dump(data_to_store, file)
        file.write("\n")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/team')
def team():
    return render_template('team.html')

@app.route('/research')
def research():
    return render_template('research.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Collect input values from the form
        input_data = {
            'product_name': request.form['product_name'],
            'original_price': float(request.form['original_price']),
            'target_price': float(request.form['target_price']),
            'main_category': request.form['main_category'],
            'condition': request.form['condition'],
            
            # Add missing fields with default values
            'page_number': request.form.get('page_number', 1),  # Default page number to 1
            'image': request.form.get('image', 'default_image_url'),  # Default image URL
            'date_scraped': request.form.get('date_scraped', '2025-09-26'),  # Default date
            'discount': request.form.get('discount', 0),  # Default discount to 0
            'rating_number': request.form.get('rating_number', 0),  # Default rating number to 0
            'title': request.form.get('title', 'Unknown'),  # Default title to "Unknown"
            'seller': request.form.get('seller', 'Unknown'),  # Default seller to "Unknown"
            'product_url': request.form.get('product_url', 'default_product_url'),  # Default product URL
            'verified_ratings': request.form.get('verified_ratings', 0),  # Default verified ratings to 0
            'competitive': request.form.get('competitive', 0)  # Default competitive price to 0
        }

        # Convert input to DataFrame (pipeline expects tabular input)
        input_df = pd.DataFrame([input_data])

        # Run the model to make a prediction
        prediction = model.predict(input_df)[0]

        # Prepare the prediction result
        result = {
            'prediction': prediction,
            'price_range': {
                'low': prediction - 10,
                'high': prediction + 10
            },
            'confidence': "95%"  # Optional: Add your logic to calculate confidence level
        }

        # Save the input data and prediction to a JSON file
        save_prediction_to_file(input_data, result)

        # Return the result to the user
        return render_template(
            'index.html',
            prediction_text=f"Predicted Price: ${prediction:.2f}",
            price_range_text=f"Price Range: ${result['price_range']['low']:.2f} - ${result['price_range']['high']:.2f}",
            confidence_text=f"Confidence Level: {result['confidence']}"
        )

    except Exception as e:
        return jsonify({'error': str(e)})


# API endpoint for programmatic access
@app.route('/predict_api', methods=['POST'])
def predict_api():
    try:
        # Get the incoming data from the request
        data = request.get_json(force=True)

        # Add default values for missing columns
        input_data = {
            'product_name': data.get('product_name', 'Unknown'),
            'original_price': float(data.get('original_price', 0)),
            'target_price': float(data.get('target_price', 0)),
            'main_category': data.get('main_category', 'Unknown'),
            'condition': data.get('condition', 'new'),

            # Add missing fields with default values
            'page_number': data.get('page_number', 1),  # Default page number to 1
            'image': data.get('image', 'default_image_url'),  # Default image URL
            'date_scraped': data.get('date_scraped', '2025-09-26'),  # Default date
            'discount': data.get('discount', 0),  # Default discount to 0
            'rating_number': data.get('rating_number', 0),  # Default rating number to 0
            'title': data.get('title', 'Unknown'),  # Default title to "Unknown"
            'seller': data.get('seller', 'Unknown'),  # Default seller to "Unknown"
            'product_url': data.get('product_url', 'default_product_url'),  # Default product URL
            'verified_ratings': data.get('verified_ratings', 0),  # Default verified ratings to 0
            'competitive': data.get('competitive', 0)  # Default competitive price to 0
        }

        # Convert the input data to DataFrame (pipeline expects tabular input)
        input_df = pd.DataFrame([input_data])

        # Run the model to make a prediction
        prediction = model.predict(input_df)[0]

        # Prepare the result
        result = {
            'prediction': prediction,
            'price_range': {
                'low': prediction - 10,
                'high': prediction + 10
            },
            'confidence': "95%"  # Optional: Add your logic to calculate confidence level
        }

        # Save the input data and prediction to a JSON file
        save_prediction_to_file(input_data, result)

        # Return the prediction result as a JSON response
        return jsonify(result)

    except Exception as e:
        # Handle any errors and return the error message as JSON
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
