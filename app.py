from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)

# Load the trained pipeline (includes preprocessing + model)
model = joblib.load('random_forest_model.joblib')


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
            'category': request.form['category'],
            'brand': request.form['brand'],
            'material': request.form['material'],
            'size': float(request.form['size']),
            'condition': request.form['condition'],
            'target_market': request.form['target_market'],
            'location': request.form['location']
        }

        # Convert input to DataFrame (pipeline expects tabular input)
        input_df = pd.DataFrame([input_data])

        # Run through the pipeline
        prediction = model.predict(input_df)[0]

        return render_template(
            'index.html',
            prediction_text=f"Predicted Price: {prediction:.2f}"
        )

    except Exception as e:
        return jsonify({'error': str(e)})

# API endpoint for programmatic access
@app.route('/predict_api', methods=['POST'])
def predict_api():
    try:
        data = request.get_json(force=True)
        input_df = pd.DataFrame([data])
        prediction = model.predict(input_df)[0]
        return jsonify({'prediction': float(prediction)})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
