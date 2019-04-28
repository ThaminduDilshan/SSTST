
sinhalaMap = {}

def loadMapping():           # loads the mapping from english-sinhala-script.csv
    with open('english-sinhala-script.csv', 'r') as vs:
        lines = vs.read().split('\n')
        for line in lines:
            if(line!=''):
                sinhalaMap[line.split(',')[0]] = line.split(',')[1]


def getScript(inpString):       # returns sinhala text for given input string (seperated by empty spaces)
    output = ''

    loadMapping()

    for word in inpString.split(' '):
        if word != ' ':
            output += sinhalaMap.get(word.strip(), '') + "        "

    return output
 

def addToMap(word, script):         # add new entry to csv file
    text = word + ', ' + script
    lastline = ''
    
    with open('english-sinhala-script.csv', 'r') as vs:
        lines = vs.read().split('\n')
        lastline = lines[-1]

        for line in lines:
            if(line!=''):
                if(line.split(',')[0].strip() == word.strip()):
                    print('Mapping already exists!')
                    return

    with open('english-sinhala-script.csv', 'a') as vs:
        if(lastline == ''):
            vs.write(text)
        else:
            vs.write('\n'+text)


def removeFromMap(key):         # remove a given script mapping from csv file
    loadMapping()
    try:
        sinhalaMap.pop(key)
    except:
        print("Key doesn't exist!")
    
    vmap = list(sinhalaMap.items())
    output = ''

    for i in range(0, len(vmap), 1):
        output += vmap[i][0] + ',' + vmap[i][1] + '\n'
    with open('english-sinhala-script.csv', 'w') as vs:
        vs.write(output)
