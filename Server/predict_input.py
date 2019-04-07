import pickle
import cv2
from keras.models import load_model
from object_detection import object_detector
from PIL import Image
from matplotlib import pyplot as plt
import voicescript_map as vmap


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
    return [str(label),str(preds[0][i]*100)]


def shiftArr(array, element):           # shift array to left by one
    array[0] = array[1]
    array[1] = array[2]
    array[2] = element

def nullCheck(array):           # return true if at least one element is null
    for el in array:
        if(el==''):
            return True
    return False

def checkThreeEqual(array):         # check for three dynamic parts (_)
    for dp1 in array:
        for dp2 in array:
            if(dp1 == dp2):
                continue
            if( dp1.split('_')[0] == dp2.split('_')[0] ):       ## if two equal parts found
                for dp3 in array:
                    if(dp3 == dp2):
                        continue
                    elif(dp3 == dp1):
                        continue
                    if( dp3.split('_')[0] == dp1.split('_')[0] ):       ## dynamic sign found
                        return dp1.split('_')[0].strip()
    return ''


#### DETECTION FOR SINGLE IMAGE ####
PATH_TO_IMAGES = 'images'
IMAGE_PATHS = [ (PATH_TO_IMAGES+'/'+'image{}.jpg'.format(i)) for i in range(1, 6) ]     ## 1-5  (1, 6)

## IMAGE_PATH = "images/test_full.jpg"
detection1 = None
detection2 = None
detection3 = None


outputString = ""
batch = ['', '', '']

for img_pt in IMAGE_PATHS:
    detected_count = object_detector.detectHand(img_pt)
    pred = ''
    accuracy = 0
    if(detected_count!=0):
        if(detected_count==1):
            pr_acc = make_prediction("slicedhand/sliced_image0.jpeg", img_pt.split("/")[-1])
            pred = pr_acc[0].strip()
            accuracy = pr_acc[1].strip()
        elif(detected_count>1):                         # if two hands captured, select the hand with highest accuracy
            pred1 = make_prediction("slicedhand/sliced_image0.jpeg", img_pt.split("/")[-1])
            pred2 = make_prediction("slicedhand/sliced_image1.jpeg", img_pt.split("/")[-1])

            if( pred1[1] >= pred2[1] ):
                pred = pred1[0].strip()
                accuracy = pred1[1].strip()
            else:
                pred = pred2[0].strip()
                accuracy = pred2[1].strip()
    
    if( float(accuracy) < 50 ):                # accuracy threshould to detect as a valid sign
        print("ACCURACY LESS THAN 0.5")     ## TESTING ##
        continue

    if('_' in pred):        # dynamic possibility
        shiftArr(batch, pred)
        if(not(nullCheck(batch))):      # if all three elements are filled in array
            check = []
            for i in range(0, 3, 1):        # extract dynamic predicts in batch
                if('&' in batch[i]):
                    ar = batch[i].split('&')
                    for ent in ar:
                        if('_' in ent):
                            check.append(ent)
                else:
                    check.append(batch[i])
            
            res = checkThreeEqual(check)        # check if the batch dynamic
            if(res!=''):
                outputString += res + ' $ '
                batch = ['', '', '']
            else:                               # not dynamic prediction
                if( ('&' in batch[0]) and ('_' not in batch[0].split('&')[0]) ):
                    outputString += batch[0].split('&')[0].strip() + ' $ '


                
    else:                       # static sign
        if(batch[0]==''):
            if( batch[1]!='' and ('&' in batch[1]) and ('_' not in batch[1].split('&')[0]) ):
                outputString += batch[1].split('&')[0].strip() + ' $ '
            if( batch[2]!='' and ('&' in batch[2]) and ('_' not in batch[2].split('&')[0]) ):
                outputString += batch[2].split('&')[0].strip() + ' $ '
        else:
            if( ('_' in batch[1]) and ('&' in batch[1]) ):
                if('_' not in batch[1].split('&')[0]):
                    outputString += batch[1].split('&')[0].strip() + ' $ '
            if( ('_' in batch[2]) and ('&' in batch[2]) ):
                if('_' not in batch[2].split('&')[0]):
                    outputString += batch[2].split('&')[0].strip() + ' $ '

        outputString += pred + ' $ '
        batch = ['', '', '']

voicemap = vmap.getScript(outputString)

print('========= OUTPUT STRING =========')
print(outputString[:-3])
print('========= VOICE SCRIPT =========')
print(voicemap[:-3])


''' HAVE TO REMOVE WHITESPACES USED WITH $ CHARACTER '''







### draw the class label + probability on the output image
##text = "{}: {:.2f}%".format(label, preds[0][i] * 100)
##cv2.putText(output, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
## 
### show the output image
##cv2.imshow("Image", output)
##cv2.waitKey(0)



