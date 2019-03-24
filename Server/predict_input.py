import pickle
import cv2
from keras.models import load_model
from object_detection import object_detector
from PIL import Image
from matplotlib import pyplot as plt


model_ = "output/Sn_sign_language_model.model"
label_bin = "output/Sn_sign_language_lb.pickle"
width = 70      # 32
height = 70     # 32

# load the model and label binarizer
print("[INFO] loading neural network...")
model = load_model(model_)
lb = pickle.loads(open(label_bin, "rb").read())

def make_prediction(image_path, image_name):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    image = cv2.resize(image, (width, height))
    image = image.astype("float") / 255.0       ## scale pixel values to [0, 1]
    image = image.flatten()                     ## flatten the image
    image = image.reshape((1, image.shape[0]))  ## add a batch

    ## uncomment if don't want to flatten
    ##image = image.reshape((1, image.shape[0], image.shape[1],
    ##image.shape[2]))

    # make a prediction
    preds = model.predict(image)

    i = preds.argmax(axis=1)[0]         ## find largest probability
    label = lb.classes_[i]

    print("Input image : " + image_name + "\t|\tSign : " + str(label) + "\t|\tAccuracy : " + str(preds[0][i]*100))
    return str(label)   ### ACCURACY SHOULD BE RETURNED TOO


#### DETECTION FOR SINGLE IMAGE ####
PATH_TO_IMAGES = 'images'
IMAGE_PATHS = [ (PATH_TO_IMAGES+'/'+'image{}.jpg'.format(i)) for i in range(1, 6) ]

## IMAGE_PATH = "images/test_full.jpg"
detection1 = None
detection2 = None
detection3 = None

for img_pt in IMAGE_PATHS:
    detected_count = object_detector.detectHand(img_pt)
    if(detected_count!=0):
        for det in range(0, detected_count, 1):
            pred = make_prediction("slicedhand/sliced_image{}.jpeg".format(det), img_pt.split("/")[-1])
    




# detected_count = object_detector.detectHand(IMAGE_PATH)

# if(detected_count!=0):
#     for det in range(0, detected_count, 1):
#         make_prediction("slicedhand/sliced_image{}.jpeg".format(det))
#         ## MAY BE SHOULD ADD ACCURACY THRESHOULD TO DETECT WHETHER IT IS CORRECT DETECTION



#     # MAKE PREDICTION SHOULD RETURN NAME OF THE SIGN #
#     # APPEND RETURN VALUE TO AN ARRAY #




### draw the class label + probability on the output image
##text = "{}: {:.2f}%".format(label, preds[0][i] * 100)
##cv2.putText(output, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
## 
### show the output image
##cv2.imshow("Image", output)
##cv2.waitKey(0)



