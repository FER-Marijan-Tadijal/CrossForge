import time
import copy
import math

startTime = time.perf_counter()

f = open("preprocessed.txt", "r")

wordBank = {}

for i in range(60):    
    wordBank[i] = set()

line = f.readline()
while line != "":
    word, value = line.split(";")

    if int(value) > 30: ## Kvaliteta riječi (usually 45 or 30)
        wordBank[len(word)].add(word)

    line = f.readline()

class cwline():
    def __init__(self, length, index):
        self.wordSet = [copy.copy(wordBank[length])]  ## Copy
        self.neighbours = set()                     ## No copy
        self.lockedIn = [False]                       ## Copy
        self.lastConstrainer = [None]                 ## Copy
        self.index = index                          ## No copy
    
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

class CWcell:
    def __init__(self):
        self.horizontal = None          ## Some clause eventually
        self.vertical = None
        self.horizontalIdx = None
        self.verticalIdx = None

f = open("15percent0.txt", "r")

acceptable = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&.")
validLetters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&")

lines = []

for line in f.readlines():
    lines.append(line.strip() + "#")
lines.append("#" * len(lines[0]))

f.close()

cwLength = len(lines[0]) - 1
cwHeight = len(lines) - 1

cellGrid = [[CWcell() for i in range(cwLength)] for j in range(cwHeight)]

crossword = [] ## Array of cwline

def checkHorizontal(rowIdx, colIdx):
    lineLength = 0

    if colIdx >= 1 and lines[rowIdx][colIdx-1] in acceptable:
        return 0
    
    while lines[rowIdx][colIdx + lineLength] in acceptable:
        lineLength += 1

    if lineLength >= 2:
        lockHorizontal(rowIdx, colIdx, lineLength)

    return

def lockHorizontal(rowIdx, colIdx, lineLength):
    newCwLine = cwline(lineLength, len(crossword))
    crossword.append(newCwLine)

    myIdx = 0
    while lines[rowIdx][colIdx + myIdx] in acceptable:
        cellGrid[rowIdx][colIdx + myIdx].horizontal = newCwLine
        cellGrid[rowIdx][colIdx + myIdx].horizontalIdx = myIdx

        myIdx += 1

def checkVertical(rowIdx, colIdx):
    lineLength = 0

    if rowIdx >= 1 and lines[rowIdx-1][colIdx] in acceptable:
        return 0
    
    while lines[rowIdx + lineLength][colIdx] in acceptable:
        lineLength += 1

    if lineLength >= 2:
        lockVertical(rowIdx, colIdx, lineLength)

    return

def lockVertical(rowIdx, colIdx, lineLength):
    newCwLine = cwline(lineLength, len(crossword))
    crossword.append(newCwLine)

    myIdx = 0
    while lines[rowIdx + myIdx][colIdx] in acceptable:
        myCell = cellGrid[rowIdx + myIdx][colIdx] 
        myCell.vertical = newCwLine
        myCell.verticalIdx = myIdx

        if myCell.horizontal != None:
            newCwLine.setNeighbour(myCell.horizontal, myCell.verticalIdx, myCell.horizontalIdx)

        myIdx += 1

for rowIdx in range(0, cwHeight):
    for colIdx in range(0, cwLength):
        checkHorizontal(rowIdx, colIdx)

for rowIdx in range(0, cwHeight):
    for colIdx in range(0, cwLength):
        checkVertical(rowIdx, colIdx)

## Get letters and constrain if necessary
for rowIdx in range(0, cwHeight):
    for colIdx in range(0, cwLength):
        myCell = cellGrid[rowIdx][colIdx]
        letter = lines[rowIdx][colIdx]
        if letter not in validLetters:
            continue

        if myCell.horizontal:
            myLine = myCell.horizontal
            myIdx = myCell.horizontalIdx
            myLine.constrain(myIdx, letter, None, set())
        
        if myCell.vertical:
            myLine = myCell.vertical
            myIdx = myCell.verticalIdx
            myLine.constrain(myIdx, letter, None, set())

#for line in crossword:
#    print(line.wordSet)

##     def constrain(self, index, letter, constrainerIndex, toRemove):

successful = 0
used = set()

def printCrossword(cw):
    print(time.perf_counter() - startTime)
    for line in cellGrid:
        for cell in line:
            if cell.horizontal != None:
                line = cw[cell.horizontal.index]
                print(next(iter(line.wordSet[-1]))[cell.horizontalIdx], end="")
            elif cell.vertical != None:
                line = cw[cell.vertical.index]
                print(next(iter(line.wordSet[-1]))[cell.verticalIdx], end="")
            else:
                print("#", end="")
        print()
    print()

## GENERATE FROM GRID ENDS HERE

successful = 0
used = set()

def tryAll(crossword):
    global successful
    global used

    noLocked = len(used)

    if noLocked >= len(crossword): ## Successfully built cw
        #printCrossword(crossword)
        successful += 1
        return
    
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

        if time.perf_counter() - startTime > 60:
            return

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

tryAll(crossword)
print(successful)