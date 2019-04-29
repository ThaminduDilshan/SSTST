import unittest
import predict_input
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
import threading


# variable definition
MODEL_NAME = 'hand_region_graph'
PATH_TO_FROZEN_GRAPH = 'object_detection/' + MODEL_NAME + '/frozen_inference_graph.pb'
PATH_TO_LABELS = os.path.join('object_detection/training', 'object-detection.pbtxt')
model_ = "output/Sn_sign_language_model.model"
label_bin = "output/Sn_sign_language_lb.pickle"


obj_category_index = None
obj_detection_graph = None
pred_graph = None
pred_model = None
pred_lb = None

processed_data = {}
pro_data_lock = threading.Lock()


class MainTestCase(unittest.TestCase):

    def setUp(self):
        global obj_detection_graph, obj_category_index, pred_graph, pred_lb, pred_model

        # load resources for object detector
        obj_detection_graph = tf.Graph()
        with obj_detection_graph.as_default():
            od_graph_def = tf.GraphDef()
            with tf.gfile.GFile(PATH_TO_FROZEN_GRAPH, 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')

        obj_category_index = label_map_util.create_category_index_from_labelmap(PATH_TO_LABELS, use_display_name=True)  # label map

        # load the graph, model and lb for predictor
        pred_model = load_model(model_)
        pik_file = open(label_bin, "rb")
        pred_lb = pickle.loads(pik_file.read())
        pik_file.close()
        pred_graph = tf.get_default_graph()


    # check functionality of predict_request function, prediction result and accuracy
    def test_predict_request(self):
        # read image file as raw data (bytes)
        fo = open('images/image4.jpg', 'rb')
        raw_img = fo.read()
        fo.close()

        # set resources in predict_input
        predict_input.obj_detection_graph = obj_detection_graph
        predict_input.obj_category_index = obj_category_index
        predict_input.graph = pred_graph
        predict_input.model = pred_model
        predict_input.lb = pred_lb

        # execute function
        rv = predict_input.predict_request('client_test', raw_img, 'thread_test', 'image_test', processed_data, pro_data_lock)

        # check result in processed_data dict
        self.assertEqual(len(processed_data), 1)
        
        pro_pred = processed_data.get('client_test$image_test')[1]
        pro_acc = processed_data.get('client_test$image_test')[2]
        self.assertEqual(pro_pred, 'three & thirteen_2')
        self.assertEqual(pro_acc, '90.45789837837219')


    # check functionality of make_prediction function
    def test_make_prediction(self):
        # set resources in predict_input
        predict_input.obj_detection_graph = obj_detection_graph
        predict_input.obj_category_index = obj_category_index
        predict_input.graph = pred_graph
        predict_input.model = pred_model
        predict_input.lb = pred_lb

        # execute function
        rv = predict_input.make_prediction('images/image4.jpg', 'thread_test', 'image_test')

        # check return value
        self.assertFalse(rv == '')
        self.assertEqual(rv, ['thirty_3', '49.432143568992615'])
        

if __name__ == '__main__':
    unittest.main()