#!/usr/bin/env python3

try:
	from queue import Queue
except ImportError:
	import Queue

import flask
import threading
import predict_input as pred
import time
import tensorflow as tf
from object_detection.utils import label_map_util
from keras.models import load_model
import pickle
import os
from datetime import datetime
from datetime import timedelta
from base64 import b64decode
import json
import voicescript_map as v_map
import sinhalascript_map as sn_map


# variable definition
MODEL_NAME = 'hand_region_graph'
PATH_TO_FROZEN_GRAPH = 'object_detection/' + MODEL_NAME + '/frozen_inference_graph.pb'
PATH_TO_LABELS = os.path.join('object_detection/training', 'object-detection.pbtxt')
model_ = "output/retrained_graph.pb"
label_file = "output/retrained_labels.txt"


# initialize flask application
app = flask.Flask(__name__)

## Creating pools
obj_detection_res = Queue(20)                # object detector resources (graph, index)
predictor_res = Queue(20)                    # predictor resources (graph, lb)
obj_detLock = threading.Lock()
predLock = threading.Lock()

# worker threads
threads = []

# new tasks
tasks = Queue(100)
taskLock = threading.Lock()

# processed tasks output [ key: client_id+'$'+image_name, value: (res_time, pred, accuracy) ]
processed_data = {}
pro_data_lock = threading.Lock()


# load object detector and predictor resources
def loadGraphModels():
    for i in range(1, 11, 1):                   # (1, 21, 1)

        # load the detection graph and category index for object detector
        print("[INFO] loading neural network for hand detector {} ...".format(i))

        obj_detection_graph = tf.Graph()
        with obj_detection_graph.as_default():
            od_graph_def = tf.GraphDef()
            with tf.gfile.GFile(PATH_TO_FROZEN_GRAPH, 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')

        obj_category_index = label_map_util.create_category_index_from_labelmap(PATH_TO_LABELS, use_display_name=True)  # label map
        obj_detLock.acquire()
        obj_detection_res.put( (obj_detection_graph, obj_category_index) )
        obj_detLock.release()

        # load the graph, model and lb for predictor
        print("[INFO] loading neural network for predictor {} ...".format(i))

        graph = tf.Graph()
        graph_def = tf.GraphDef()

        with open(model_, "rb") as fmod:
            graph_def.ParseFromString(fmod.read())
        with graph.as_default():
            tf.import_graph_def(graph_def)

        label = []
        proto_as_ascii_lines = tf.gfile.GFile(label_file).readlines()
        for l in proto_as_ascii_lines:
            label.append(l.rstrip())

        predLock.acquire()
        predictor_res.put( (graph, label) )
        predLock.release()


# create worker threads
def create_threads():
    for tid in range(1, 21, 1):  ## 1,51,1
        thread = pred.PredictThread(tid, 'thread_{}'.format(tid), tasks, taskLock, obj_detection_res, obj_detLock, predictor_res, predLock, processed_data, pro_data_lock)
        thread.start()
        threads.append(thread)
        print("[INFO] Thread {} created and added to the pool...".format(tid))


# thread to clear output dictionary (older outputs should be removed)
class OutputManager(threading.Thread):
    def __init__(self, threadID, name):
        threading.Thread.__init__(self)
        self.threadID  =threadID
        self.name = name

    def run(self):
        print("Starting " + self.name + " cleaner thread")
        manage_output()
        print("Exiting " + self.name + " cleaner thread")


# manage output dictionary (predictions older than 10min will be removed)
def manage_output():
    tocheck  = False
    sleepTime = 30 * 60             # default sleep time = 30 mins
    while True:                 # check at 30 min intervals
        if(tocheck):
            if(len(processed_data) > 0):
                print("[INFO] Running output cleaner thread ... ")
                pro_data_lock.acquire()
                keys = list(processed_data.keys())
                for key in keys:
                    processed_time = processed_data.get(key)[0]
                    current_time = datetime.now().strftime("%H:%M:%S")
                    time_int = datetime.strptime(current_time, "%H:%M:%S") - datetime.strptime(processed_time, "%H:%M:%S")
                    if time_int.days < 0:
                        time_int = timedelta(days=0, seconds=time_int.seconds, microseconds=time_int.microseconds)
                    
                    if time_int.total_seconds() > 10*60:        # remove predictions older than 10 mins
                        del processed_data[key]

                pro_data_lock.release()
                print("[INFO] Pausing output cleaner thread ... ")
                tocheck = False
            else:
                tocheck = False
                sleepTime = 60 * 60         # if no predictions sleep for 1 h
        else:
            time.sleep(sleepTime)         # sleep for 10 mins
            sleepTime = 30 * 60         # set again to default sleep time (30 mins)
            tocheck = True

# create cleaner thread
def create_cleaner():
    cl_thread = OutputManager(1, 'cleaner_01')
    print("[INFO] Cleaner thread created ...")
    cl_thread.start()


# route for prediction requests with images
@app.route('/predict', methods=["POST"])
def serve():
    try:
        if flask.request.method == "POST":
            rec_data = json.loads(flask.request.data.decode('utf-8'))
            if 'image' in rec_data:
                print("New Request => client id: " + rec_data['client_id'] + " | image_name: " + rec_data['image_name'])

                tasks.put( ( rec_data['client_id'], b64decode(rec_data['image']), rec_data['image_name'] ) )

                response = "received:" + rec_data['image_name']
                return flask.jsonify((response))
    except:
        print("[ERROR] Error occured with prediction request ... !!!")
        return flask.jsonify('error')



# route for checking prediction results
@app.route('/check', methods=["POST"])
def ifDone():
    try:
        if flask.request.method == "POST":
            rec_data = json.loads(flask.request.data.decode('utf-8'))
            cli_id = rec_data['client_id']
            img_name = rec_data['image_name']

            print("Processed Request => client id: " + cli_id + " | image_name: " + img_name)

            pro_data_lock.acquire()
            ret = processed_data.get(cli_id + '$' + img_name, 'wait')
            if not ret == 'wait':
                del processed_data[cli_id + '$' + img_name]
                if float(ret[2]) >= 40:         # prediction is equal or more than 40%
                    ret = (img_name, ret[1])
                else:
                    ret = (img_name, 'none')

            pro_data_lock.release()

            return flask.jsonify(ret)
    except:
        print("[ERROR] Error occured with result checking request ... !!!")
    



# route for checking prediction results
@app.route('/voice', methods=["POST"])
def getVoiceScript():
    try:
        if flask.request.method == "POST":
            rec_data = json.loads(flask.request.data.decode('utf-8'))
            cli_id = rec_data['client_id']
            text = rec_data['text']

            print("Voice Request => client id: " + cli_id)
            voice = v_map.getScript(text)
            sinhala_txt = sn_map.getScript(text)

            return flask.jsonify((voice, sinhala_txt))              # return voice along with sinhala text
    except:
        print("[ERROR] Error occured with voice script request ... !!!")



if __name__ == "__main__":
    try:
        print("[INFO] Server started...\n[INFO] Wait until thread creation finish (10 threads in total) ...")
        loadGraphModels()
        create_threads()
        create_cleaner()
        print("[INFO] Loading complete...\n[INFO] Server is running...")
        app.run(host='0.0.0.0')
    except:
        print("[ERROR] Error in server initialization process ... !!!")


