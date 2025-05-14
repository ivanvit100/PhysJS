from flask import Flask, render_template, jsonify, send_from_directory, redirect
import json
import os

app = Flask(__name__, template_folder='./')

@app.route('/')
def main_page():
    return render_template('index.html')

@app.route('/lab/index.html/')
def lab_index_redirect():
    return redirect('/')

@app.route('/lab/<i>', methods=['GET'])
def lab_redirect(i):
    return redirect(f'/lab/{i}/')

@app.route('/lab/<i>/', methods=['GET'])
def lab_page(i):
    return render_template(f'./labs/lab{i}/index.html', lab_id=i)

@app.route('/lab/<filename>/')
def serve_lab_file(filename):
    print(f"Serving lab file: {filename}")
    try:
        return send_from_directory("./static/", filename)
    except FileNotFoundError:
        print(f"Lab file not found: {filename}")
        return jsonify({"error": "File not found"}), 404

@app.route('/lab/<i>/<path:filename>')
def serve_static_from_lab(filename, i):
    return send_from_directory(f'./labs/lab{i}/', filename)

@app.route('/api/labs')
def get_labs():
    try:
        json_path = os.path.join(app.static_folder, 'labs.json')
        
        if not os.path.exists(json_path):
            return jsonify({"error": "Labs data not found"}), 404
        
        with open(json_path, 'r', encoding='utf-8') as file:
            labs = json.load(file)
            
        return jsonify(labs)
        
    except json.JSONDecodeError as e:
        return jsonify({"error": f"JSON parsing error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to load labs: {str(e)}"}), 500

@app.route('/api/tags')
def get_tags():
    try:
        json_path = os.path.join(app.static_folder, 'labs.json')
        
        if not os.path.exists(json_path):
            return jsonify({"error": "Labs data not found"}), 404
        
        with open(json_path, 'r', encoding='utf-8') as file:
            labs = json.load(file)
        
        all_tags = []
        for lab in labs:
            if "tags" in lab and isinstance(lab["tags"], list):
                all_tags.extend(lab["tags"])
        
        unique_tags = []
        for tag in all_tags:
            if tag not in unique_tags:
                unique_tags.append(tag)
        
        tags_dict = {}
        for tag in all_tags:
            if tag in tags_dict:
                tags_dict[tag] += 1
            else:
                tags_dict[tag] = 1
        
        sorted_tags = dict(sorted(tags_dict.items(), key=lambda x: x[1], reverse=True))
        
        return jsonify({
            "tags": unique_tags,
            "tagsWithCount": sorted_tags,
            "total": len(unique_tags)
        })
        
    except json.JSONDecodeError as e:
        return jsonify({"error": f"JSON parsing error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to get tags: {str(e)}"}), 500

def run_app():
    app.run(debug=True)

if __name__ == '__main__':
    run_app()