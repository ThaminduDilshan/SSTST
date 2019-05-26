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


width = 70      # 32
height = 70     # 32

# object detector variables
obj_detection_graph = None
obj_category_index = None

# predictor variables
graph = None
model = None
lb = None

# predictor code (predict for the given image in system memory)
def make_prediction(image_path, tname, image_name):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    image = cv2.resize(image, (width, height))
    image = image.astype("float") / 255.0       ## scale pixel values to [0, 1]
    image = image.flatten()                     ## flatten the image
    image = image.reshape((1, image.shape[0]))  ## add a batch

    # make a prediction
    with graph.as_default():
        preds = model.predict(image)

    i = preds.argmax(axis=1)[0]         ## find largest probability
    label = lb.classes_[i]

    # print("Thread : "+ tname +"\t\tInput image : " + image_name + " \t|\tSign : " + str(label) + "\t|\tAccuracy : " + str(preds[0][i]*100))
    return [str(label),str(preds[0][i]*100)]


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
        for i in range(0, detected_count, 1):
            pred1 = make_prediction("../slicedhand/{}#sliced_image{}.jpeg".format(threadname, i), threadname, image_name)
            
            if(pred == ''):
                pred = pred1[0].strip()
                accuracy = pred1[1].strip()
            else:
                if( float(pred1[1]) > float(accuracy) ):
                    pred = pred1[0].strip()
                    accuracy = pred1[1].strip()

    print("Thread : "+ threadname +"\t\tInput image : " + image_name + " \t|\tSign : " + str(pred) + "\t|\tAccuracy : " + str(accuracy))

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
            global obj_detection_graph, obj_category_index, graph, model, lb

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
                        model = dt2[1]
                        lb = dt2[2]
                        pred_lock.release()
                        break
                    else:                       # release lock if queue is empty
                        pred_lock.release()
                        continue
                else:
                    time.sleep(randint(0,2))            # wait for a resource pack
            
            
            # do prediction
            predict_request(dat_client_id, dat_image, tname, dat_img_name, output_dat, output_lock)
            
            # release resources (object detector)
            objdet_lock.acquire()
            objdet_pool.put( (obj_detection_graph, obj_category_index) )
            objdet_lock.release()

            # release resources (predictor)
            pred_lock.acquire()
            pred_pool.put( (graph, model, lb) )
            pred_lock.release()
