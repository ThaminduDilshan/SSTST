import cv2
import numpy as np
import os
import tensorflow as tf

from distutils.version import StrictVersion
# from matplotlib import pyplot as plt
from PIL import Image

from object_detection.utils import ops as utils_ops
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util


if StrictVersion(tf.__version__) < StrictVersion('1.9.0'):
  raise ImportError('Please upgrade your TensorFlow installation to v1.9.* or later!')


# Size, in inches, of the output images.
IMAGE_SIZE = (6, 8)   ## (6, 8)
detection_graph = None
category_index = None


# Function definitions
def load_image_into_numpy_array(image):
  (im_width, im_height) = image.size
  return np.array(image.getdata()).reshape(
      (im_height, im_width, 3)).astype(np.uint8)

def run_inference_for_single_image(image, graph):
  with graph.as_default():
    with tf.Session() as sess:
      # Get handles to input and output tensors
      ops = tf.get_default_graph().get_operations()
      all_tensor_names = {output.name for op in ops for output in op.outputs}
      tensor_dict = {}
      for key in [
          'num_detections', 'detection_boxes', 'detection_scores',
          'detection_classes', 'detection_masks'
      ]:
        tensor_name = key + ':0'
        if tensor_name in all_tensor_names:
          tensor_dict[key] = tf.get_default_graph().get_tensor_by_name(
              tensor_name)
      if 'detection_masks' in tensor_dict:
        # The following processing is only for single image
        detection_boxes = tf.squeeze(tensor_dict['detection_boxes'], [0])
        detection_masks = tf.squeeze(tensor_dict['detection_masks'], [0])
        # Reframe is required to translate mask from box coordinates to image coordinates and fit the image size.
        real_num_detection = tf.cast(tensor_dict['num_detections'][0], tf.int32)
        detection_boxes = tf.slice(detection_boxes, [0, 0], [real_num_detection, -1])
        detection_masks = tf.slice(detection_masks, [0, 0, 0], [real_num_detection, -1, -1])
        detection_masks_reframed = utils_ops.reframe_box_masks_to_image_masks(
            detection_masks, detection_boxes, image.shape[0], image.shape[1])
        detection_masks_reframed = tf.cast(
            tf.greater(detection_masks_reframed, 0.5), tf.uint8)
        # Follow the convention by adding back the batch dimension
        tensor_dict['detection_masks'] = tf.expand_dims(
            detection_masks_reframed, 0)
      image_tensor = tf.get_default_graph().get_tensor_by_name('image_tensor:0')

      # Run inference
      output_dict = sess.run(tensor_dict,
                             feed_dict={image_tensor: np.expand_dims(image, 0)})

      # all outputs are float32 numpy arrays, so convert types as appropriate
      output_dict['num_detections'] = int(output_dict['num_detections'][0])
      output_dict['detection_classes'] = output_dict[
          'detection_classes'][0].astype(np.uint8)
      output_dict['detection_boxes'] = output_dict['detection_boxes'][0]
      output_dict['detection_scores'] = output_dict['detection_scores'][0]
      if 'detection_masks' in output_dict:
        output_dict['detection_masks'] = output_dict['detection_masks'][0]
  return output_dict


# Detection

def detectHand(image, detection_gr, category_ind, threadname):
    global detection_graph
    global category_index
    detection_graph = detection_gr
    category_index = category_ind

    # image = Image.open(image_path)
    image_np = load_image_into_numpy_array(image)
    image_np_expanded = np.expand_dims(image_np, axis=0)      ## Expand dimensions since the model expects images to have shape: [1, None, None, 3]
    output_dict = run_inference_for_single_image(image_np, detection_graph)
    # plt.figure(figsize=IMAGE_SIZE)

    # crop the detected regions (hands in image)
    img_height, img_width, img_channel = image_np.shape

    i = 0
    saved_count = 0
    for box in output_dict['detection_boxes']:          ## iterate through each detection box
        if output_dict['detection_scores'][i] > 0.5:        ## 0.5 is taken as the threshould
            ymin, xmin, ymax, xmax = box
            x_up = int(xmin*img_width)
            y_up = int(ymin*img_height)
            x_down = int(xmax*img_width)
            y_down = int(ymax*img_height)

            try:                ## try to increase the detected region (if model accuracy is very high, no need for this step)
                abs_coord = (x_up-20, y_up-20, x_down+20, y_down+20)
                bounding_box_img = image_np[abs_coord[1]:abs_coord[3], abs_coord[0]:abs_coord[2], :]
                new_img = Image.fromarray(bounding_box_img)      ## conversion to an image
                # new_img = new_img.rotate(-90, expand=True)
                new_img.save("../slicedhand/{}#sliced_image{}.jpeg".format(threadname, i))
                saved_count += 1
            except:             ## if image margin exceeded, use original cropped image
                abs_coord = (x_up, y_up, x_down, y_down)
                bounding_box_img = image_np[abs_coord[1]:abs_coord[3], abs_coord[0]:abs_coord[2], :]
                new_img = Image.fromarray(bounding_box_img)      ## conversion to an image
                # new_img = new_img.rotate(-90, expand=True)
                new_img.save("../slicedhand/{}#sliced_image{}.jpeg".format(threadname, i))
                saved_count += 1

        i = i + 1
    # plt.clf()
    
    return saved_count
