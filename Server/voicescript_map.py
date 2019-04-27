
voiceMap = {}

def loadMapping():           # loads the mapping from sinhala-textscript.csv
    with open('sinhala-textscript.csv', 'r') as vs:
        lines = vs.read().split('\n')
        for line in lines:
            if(line!=''):
                voiceMap[line.split(',')[0]] = line.split(',')[1]


def getScript(inpString):       # returns voicescript for given input string (seperated by an empty space)
    output = ''

    loadMapping()

    for word in inpString.split(' '):
        if word != ' ':
            output += voiceMap.get(word.strip(), '') + "        "

    return output
 

def addToMap(word, script):         # add new entry to csv file
    text = word + ', ' + script
    lastline = ''
    
    with open('sinhala-textscript.csv', 'r') as vs:
        lines = vs.read().split('\n')
        lastline = lines[-1]

        for line in lines:
            if(line!=''):
                if(line.split(',')[0].strip() == word.strip()):
                    print('Mapping already exists!')
                    return

    with open('sinhala-textscript.csv', 'a') as vs:
        if(lastline == ''):
            vs.write(text)
        else:
            vs.write('\n'+text)


def removeFromMap(key):         # remove a given script mapping from csv file
    loadMapping()
    try:
        voiceMap.pop(key)
    except:
        print("Key doesn't exist!")
    
    vmap = list(voiceMap.items())
    output = ''

    for i in range(0, len(vmap), 1):
        output += vmap[i][0] + ',' + vmap[i][1] + '\n'
    with open('sinhala-textscript.csv', 'w') as vs:
        vs.write(output)
