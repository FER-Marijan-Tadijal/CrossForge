import random
import time
import copy
import math
import json
import sys
import os

startTime = time.perf_counter()

# Read JSON input (from stdin)
json_input = json.load(sys.stdin)

lines_input = json_input["lines"]
minQuality = json_input["minQuality"]
blacklist = json_input["blacklist"]
language = json_input["language"]

script_dir = os.path.dirname(__file__)
file_path = os.path.join(script_dir, language + ".txt")

f = open(file_path, "r")

wordBank = {}

for i in range(60):    
    wordBank[i] = set()

line = f.readline()
while line != "":
    word, value = line.split(";")

    if int(value) > minQuality and word not in blacklist: ## Kvaliteta riječi (usually 45 or 30)
        wordBank[len(word)].add(word)

    line = f.readline()

def to_ts_lines(crossword):
    output = []

    for line in crossword:
        # Get the most recent word if any, else placeholder
        latest_words = line.wordSet[-1]
        word = next(iter(latest_words)) if latest_words else ""
        
        output.append({
            "index": line.index,
            "direction": line.direction,
            "start": list(line.start),
            "length": line.length,
            "word": word,
            "neighbours": [
                {
                    "neighbourIndex": neighbour.index,
                    "ownIdx": ownIdx,
                    "otherIdx": otherIdx
                } for neighbour, ownIdx, otherIdx in line.neighbours
            ]
        })

    return output

class cwline():
    def __init__(self, length, index, direction, start):
        self.wordSet = [copy.copy(wordBank[length])]  ## Copy
        self.neighbours = set()                     ## No copy
        self.lockedIn = [False]                       ## Copy
        self.lastConstrainer = [None]                 ## Copy
        self.index = index                          ## No copy
        self.length = length                        # <-- useful for output
        self.direction = direction                  # 'across' or 'down'
        self.start = start                          # (row, col)
    
    def setNeighbour(self, neighbour, ownIdx, otherIdx): ## neighbour = cwline
        self.neighbours.add((neighbour, ownIdx, otherIdx))
        neighbour.neighbours.add((self, otherIdx, ownIdx))

    def constrain(self, index, letter, constrainerIndex, toRemove):
        newSet = set()
        for word in self.wordSet[-1]:
            if word[index] == letter:
                newSet.add(word)

        if len(newSet) == 0:
            return letter
        
        if len(newSet) < len(self.wordSet[-1]):
            self.lastConstrainer.append(constrainerIndex)
        else:
            self.lastConstrainer.append(self.lastConstrainer[-1])

        self.wordSet.append(newSet)
        toRemove.add(self)

    def lockIn(self, word, toRemove):
        for neighbour, ownIdx, otherIdx in self.neighbours:
            newConstraint = neighbour.constrain(otherIdx, word[ownIdx], self.index, toRemove)

            if newConstraint != None:
                return (newConstraint, ownIdx)

        self.lockedIn.append(True)
        self.wordSet.append(set([word]))

## GENERATE FROM GRID STARTS HERE

# Build cwline instances
crossword = []
for line in lines_input:
    new_line = cwline(
            length=line["length"],
            index=line["index"],
            direction=line["direction"],
            start=tuple(line["start"])
        )
    crossword.append(new_line)

# Set neighbours
for line in lines_input:
    current = crossword[line['index']]
    for n in line['neighbours']:
        neighbour = crossword[n['neighbourIndex']]
        current.setNeighbour(neighbour, n['ownIdx'], n['otherIdx'])

# Apply locked-in letters
for line in lines_input:
    current = crossword[line['index']]
    locked = line.get('word')
    toRemove = set()
    for i, char in enumerate(locked):
        if char and char != ".":
            current.constrain(i, char, None, toRemove)

## GENERATE FROM GRID ENDS HERE

used = set()

def tryAll(crossword):
    global used

    noLocked = len(used)

    if noLocked >= len(crossword): ## Successfully built cw - you should return this as json and exit.
        print(json.dumps(to_ts_lines(crossword)))
        sys.exit()
    
    smallestLen = math.inf
    smallestIdx = 0
    currLine = crossword[0]
    for lineidx in range(len(crossword)):
        myLine = crossword[lineidx]
        if myLine.lockedIn[-1]:
            continue
        if len(myLine.wordSet[-1]) < smallestLen:
            currLine = myLine
            smallestLen = len(myLine.wordSet[-1])
            smallestIdx = lineidx
        
    AtLeastOneSuccess = False
    localConstraints = set()
    skipFlag = False
    
    for word in currLine.wordSet[-1]:
        if word in used:
            continue
        for letter, index in localConstraints:
            if word[index] == letter:
                skipFlag = True
                break
        if skipFlag:
            skipFlag = False
            continue
        
        ## newcw = copy.deepcopy(crossword) ## Do not deepcopy, instead, hold toRemove.
        toRemove = set() ## list of cwline that need to be popped at the end

        if time.perf_counter() - startTime > 7:
            print(json.dumps({"message": "Time limit surpassed. Fill in some words yourself or paint more of the grid black."}))
            exit()

        ## Do forward checking
        newConstraint = crossword[smallestIdx].lockIn(word, toRemove)
        if newConstraint != None:
            localConstraints.add(newConstraint)

            for node in toRemove:
                node.wordSet.pop()
                node.lastConstrainer.pop()

            continue

        ## Continue solving crossword. Then Backjump if needed.
        used.add(word)
        TAResult = tryAll(crossword)
        used.remove(word)

        currLine.wordSet.pop()
        currLine.lockedIn.pop()
        for node in toRemove:
            node.wordSet.pop()
            node.lastConstrainer.pop()

        if TAResult is None:
            AtLeastOneSuccess = True
        elif TAResult == "No Backjump":
            pass
        elif TAResult != smallestIdx:
            return TAResult

    if not AtLeastOneSuccess:
        if currLine.lastConstrainer[-1] == None:
            return "No Backjump"
        else:
            return currLine.lastConstrainer[-1]
    
    return

randomLineIdx = random.randint(0, len(crossword)-1)
randomLine = crossword[randomLineIdx]
randomlyOrdered = list(randomLine.wordSet[-1])
random.shuffle(randomlyOrdered)

for word in randomlyOrdered:
    toRemove = set()

    newConstraint = crossword[randomLineIdx].lockIn(word, toRemove)
    if newConstraint != None:
        for node in toRemove:
            node.wordSet.pop()
            node.lastConstrainer.pop()

        continue

    used.add(word)
    TAResult = tryAll(crossword)
    used.remove(word)

    randomLine.wordSet.pop()
    randomLine.lockedIn.pop()
    for node in toRemove:
        node.wordSet.pop()
        node.lastConstrainer.pop()

print(json.dumps({"message": "No viable fills found. Lower your word quality or delete some word choices."}))