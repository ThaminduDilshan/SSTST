from keras.models import load_model
import pickle
import cv2

model_ = "output/Sn_sign_language_model.model"
label_bin = "output/Sn_sign_language_lb.pickle"
width = 70      # 32
height = 70     # 32

# load the model and label binarizer
print("[INFO] loading neural network...")
model = load_model(model_)
lb = pickle.loads(open(label_bin, "rb").read())


def make_prediction(image_path):
    # load the input image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    ##output = image.copy()
    image = cv2.resize(image, (width, height))

    # scale the pixel values to [0, 1]
    image = image.astype("float") / 255.0


    # flatten the image and add a batch
    image = image.flatten()
    image = image.reshape((1, image.shape[0]))

    ## uncomment if don't want to flatten
    ##image = image.reshape((1, image.shape[0], image.shape[1],
    ##image.shape[2]))

    # make a prediction
    preds = model.predict(image)

    # find the largest probability
    i = preds.argmax(axis=1)[0]
    label = lb.classes_[i]

    print("Input image : " + image_path.split("/")[-1] + "\t|\tSign : " + str(label) + "\t|\tAccuracy : " + str(preds[0][i]*100))



make_prediction("images/test_sign_1.jpg")
make_prediction("images/test_sign_2.jpg")
make_prediction("images/test_sign_3.jpg")



### draw the class label + probability on the output image
##text = "{}: {:.2f}%".format(label, preds[0][i] * 100)
##cv2.putText(output, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
## 
### show the output image
##cv2.imshow("Image", output)
##cv2.waitKey(0)



