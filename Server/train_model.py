from sklearn.preprocessing import LabelBinarizer                ## scikit-learn
from sklearn.model_selection import train_test_split            ## binarize labels, splitting data for training/testing, generate training report
from sklearn.metrics import classification_report
from keras.models import Sequential                     ## high level frontend into TensorFlow
from keras.layers.core import Dense
from keras.optimizers import SGD
from imutils import paths                       ## generate list of image file paths for training
import matplotlib               ## for the plotting
matplotlib.use("Agg")           ## access figure canvas as an rgb string
import matplotlib.pyplot as plt
import numpy as np                      ## for numerical processing
import random
import pickle
import cv2                      ## open source computer vision and machine learning library
import os               ## to use operating system dependent functionality



###### RESOURCE PATHS ######
dataset ="signs_dataset"
model_ = "output/Sn_sign_language_model.model"
label_bin = "output/Sn_sign_language_lb.pickle"                 ## output label binarizer file
plot = "output/training_graph"                   ## training plot image

##### VARIABLES ######
IMAGE_SIZE = 70                 ## 32
BATCH_SIZE = 32
TEST_SIZE = 0.25
COLOR_SCHEME_MULTIPLIER = 1     ## 1=grayscale, 3=rgb
INIT_LR = 0.01          # initial learning rate
EPOCHS = 75

# declare arrays for the data and labels
data = []
labels = []             ## classes corresponding to each image in the dataset



print("[INFO] loading dataset...")

# grab the image paths and randomly shuffle them
imagePaths = sorted( list(paths.list_images(dataset)) )
random.seed(42)
random.shuffle(imagePaths)

# loop over image paths
it = 0
for ip in imagePaths:
        it = it + 1
        img = cv2.imread(ip, cv2.IMREAD_GRAYSCALE)
        img = cv2.resize(img, (IMAGE_SIZE, IMAGE_SIZE)).flatten()       ## resize and flatten image
        data.append(img)
        label = ip.split(os.path.sep)[-2]
        labels.append(label)
        
print("[INFO] " + str(it) + " images discovered...")

# scale raw pixel intensities to the range [0, 1]
data = np.array(data, dtype="float") / 255.0
labels = np.array(labels)               ## convert to NumPy array

#print(data)
#print(labels)



# partition the data into training(75%) and testing(25%)
(trainX, testX, trainY, testY) = train_test_split(data, labels, test_size=TEST_SIZE, random_state=42)   ## using scikit-learn
                                                        ## trainX, testX => image data, trainY, testY => labels

# convert the labels from integers to vectors (for keras)       [1, 0, 0, ...] => first class
lb = LabelBinarizer()
trainY = lb.fit_transform(trainY)
testY = lb.transform(testY)



############### MODEL ARCHITECTURE ################
'''
network contains one input layer, two hidden layers and one output layer
input layer => input_shape = IMAGE_SIZE*IMAGE_SIZE*COLOR_SCHEME_MULTIPLIER (3=rgb, 1=grayscale)
first hidden layer => 1024 nodes
second hidden layer => 512 nodes
output layer => (number of classes) nodes
'''

# define the architecture using Keras
model = Sequential()
model.add(Dense(1024, input_shape=(IMAGE_SIZE*IMAGE_SIZE*COLOR_SCHEME_MULTIPLIER,), activation="sigmoid"))   ## IMAGE_SIZE*IMAGE_SIZE*COLOR_SCHEME_MULTIPLIER (32x32x3 = 3072) pixels in a rgb flattened input image
model.add(Dense(512, activation="sigmoid"))
model.add(Dense(len(lb.classes_), activation="softmax"))

print("[INFO] training network...")

# compile the model using SGD as optimizer (Stochastic Gradient Descent)
opt = SGD(lr=INIT_LR)
model.compile(loss="categorical_crossentropy", optimizer=opt, metrics=["accuracy"])

# train the neural network (fit)
H = model.fit(trainX, trainY, validation_data=(testX, testY), epochs=EPOCHS, batch_size=BATCH_SIZE)



print("[INFO] evaluating network...")

# evaluate the network on testing data
predictions = model.predict(testX, batch_size=BATCH_SIZE)
print(classification_report(testY.argmax(axis=1), predictions.argmax(axis=1), target_names=lb.classes_))

# plot the training loss and accuracy
N = np.arange(0, EPOCHS)
plt.style.use("ggplot")
plt.figure()
plt.plot(N, H.history["loss"], label="train_loss")
plt.plot(N, H.history["val_loss"], label="val_loss")
plt.plot(N, H.history["acc"], label="train_acc")
plt.plot(N, H.history["val_acc"], label="val_acc")
plt.title("Training Loss and Accuracy (Simple NN)")
plt.xlabel("Epoch #")
plt.ylabel("Loss/Accuracy")
plt.legend()
plt.savefig(plot)



print("[INFO] serializing network and label binarizer...")

# save the model and label binarizer to disk
model.save(model_)
f = open(label_bin, "wb")
f.write(pickle.dumps(lb))
f.close()
