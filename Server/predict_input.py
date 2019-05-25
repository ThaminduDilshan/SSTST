import pickle
import cv2
from keras.models import load_model
from object_detection import object_detector
from PIL import Image
from PIL import ImageFile
import voicescript_map as vmap
import io
import tensorflow as tf
from object_detection.utils import label_map_util
import time
import threading
from queue import Queue
from random import randint
from datetime import datetime
import numpy as np



width = 299      # 32
height = 299     # 32

# object detector variables
obj_detection_graph = None
obj_category_index = None

# predictor variables
graph = None
labels = None


# read tensor from image (copied from a code in tensorflow tutorial)
def read_tensor_from_image_file(file_name, input_height=299, input_width=299, input_mean=0, input_std=255):
  input_name = "file_reader"
  output_name = "normalized"
  
  file_reader = tf.read_file(file_name, input_name)
  image_reader = tf.image.decode_jpeg(file_reader, channels=3, name="jpeg_reader")
  
  float_caster = tf.cast(image_reader, tf.float32)
  dims_expander = tf.expand_dims(float_caster, 0)
  resized = tf.image.resize_bilinear(dims_expander, [input_height, input_width])
  normalized = tf.divide(tf.subtract(resized, [input_mean]), [input_std])
  sess = tf.Session()
  result = sess.run(normalized)

  return result


# predictor code (predict for the given image in system memory)
def make_prediction(image_path, tname, image_name):
    t = read_tensor_from_image_file(image_path)
    input_layer = 'Placeholder'
    output_layer = 'final_result'

    input_name = "import/" + input_layer
    output_name = "import/" + output_layer
    input_operation = graph.get_operation_by_name(input_name)
    output_operation = graph.get_operation_by_name(output_name)

    with tf.Session(graph=graph) as sess:
        results = sess.run( output_operation.outputs[0], {input_operation.outputs[0]: t} )
    results = np.squeeze(results)

    top_k = results.argsort()[-1:][::-1]
    pred_lbl = ''
    pred_acc = ''
    for i in top_k:
        pred_lbl = labels[i]
        pred_acc = float(results[i])*100

    print("Thread : "+ tname +"\t\tInput image : " + image_name + " \t|\tSign : " + str(pred_lbl) + "\t|\tAccuracy : " + str(pred_acc))
    return [str(pred_lbl), str(pred_acc)]


# predict for a client request (if more than one detections from object detector, add the prediction with the highest accuracy)
def predict_request(client_id, image, threadname, image_name, output_dat, output_lock):
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    image = Image.open(io.BytesIO(image))

    # detect and crop hand region
    detected_count = object_detector.detectHand(image, obj_detection_graph, obj_category_index, threadname)
    
    # predict sign
    pred = ''
    accuracy = 0

    if(detected_count==1):
        pr_acc = make_prediction("../slicedhand/{}#sliced_image0.jpeg".format(threadname), threadname, image_name)
        pred = pr_acc[0].strip()
        accuracy = pr_acc[1].strip()
    elif(detected_count>1):                         # if two hands captured, select the hand with highest accuracy
        pred1 = make_prediction("../slicedhand/{}#sliced_image0.jpeg".format(threadname), threadname, image_name)
        pred2 = make_prediction("../slicedhand/{}#sliced_image1.jpeg".format(threadname), threadname, image_name)

        if( pred1[1] >= pred2[1] ):
            pred = pred1[0].strip()
            accuracy = pred1[1].strip()
        else:
            pred = pred2[0].strip()
            accuracy = pred2[1].strip()

    # add prediction to the output dictionary
    output_lock.acquire()
    res_time = datetime.now().strftime("%H:%M:%S")              # time which the prediction happen
    output_dat[client_id+'$'+image_name] = (res_time, pred, accuracy)
    output_lock.release()


# Predictor thread class definition (worker threads)
class PredictThread(threading.Thread):
    def __init__(self, threadID, name, workque, worklock, objdet_pool, objdet_lock, pred_pool, pred_lock, output_dat, output_lock):
        threading.Thread.__init__(self)
        self.threadID  =threadID
        self.name = name
        self.workque = workque
        self.worklock = worklock
        self.objdet_pool = objdet_pool
        self.objdet_lock = objdet_lock
        self.pred_pool = pred_pool
        self.pred_lock = pred_lock
        self.output_dat = output_dat
        self.output_lock = output_lock

    def run(self):
        print("Starting " + self.name + " thread")
        work(self.name, self.workque, self.worklock, self.objdet_pool, self.objdet_lock, self.pred_pool, self.pred_lock, self.output_dat, self.output_lock)
        print("Exiting " + self.name + " thread")


# thread execution logic
def work(tname, workque, worklock, objdet_pool, objdet_lock, pred_pool, pred_lock, output_dat, output_lock):
    while True:
        if workque.empty():                 # wait if no work in the queue
            time.sleep(randint(0,2))
        else:
            # get the work from queue (get image)
            worklock.acquire()
            if not workque.empty():
                data = workque.get()
                dat_client_id = data[0]
                dat_image = data[1]
                dat_img_name = data[2]
                worklock.release()
            else:                       # release lock if queue is empty
                worklock.release()
                continue
            
            # process data
            global obj_detection_graph, obj_category_index, graph, labels

            # get object detector resource pack (graph, index)
            while True:
                if not objdet_pool.empty():
                    objdet_lock.acquire()
                    if not objdet_pool.empty():             # get object detector graph and index
                        dt1 = objdet_pool.get()
                        obj_detection_graph = dt1[0]
                        obj_category_index = dt1[1]
                        objdet_lock.release()
                        break
                    else:                       # release lock if queue is empty
                        objdet_lock.release()
                        continue
                else:
                    time.sleep(randint(0,2))            # wait for a graph and index

            # get predictor resource pack (graph, model, lb)
            while True:
                if not pred_pool.empty():
                    pred_lock.acquire()
                    if not pred_pool.empty():             # get predictor graph, model and lb
                        dt2 = pred_pool.get()
                        graph = dt2[0]
                        labels = dt2[1]
                        pred_lock.release()
                        break
                    else:                       # release lock if queue is empty
                        pred_lock.release()
                        continue
                else:
                    time.sleep(randint(0,2))            # wait for a resource pack
            
            
            # do prediction
            try:
                predict_request(dat_client_id, dat_image, tname, dat_img_name, output_dat, output_lock)
            except:
                print("[ERROR] Error when predicting ... !!!")
            
            # release resources (object detector)
            objdet_lock.acquire()
            objdet_pool.put( (obj_detection_graph, obj_category_index) )
            objdet_lock.release()

            # release resources (predictor)
            pred_lock.acquire()
            pred_pool.put( (graph, labels) )
            pred_lock.release()
