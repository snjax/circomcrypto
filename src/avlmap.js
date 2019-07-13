const {mimc7} = require("circomlib");

const hash = (...args) => mimc7.multiHash(args);

function copy(o) {
  return Object.assign({}, o);
}

function update(o, x) {
  for (let i in o) delete o[i];
  return Object.assign(o, x);
}

const EMPTY_TREE = {type:"leaf", height:1, index: 0n, value: 0n}
const MAX_TREE_HEIGHT = 16;

function TreeGet(node, index) {
  if (node.type === "node") 
    if (index <= node.index) return TreeGet(node.left, index);
    else return TreeGet(node.right, index)
  else if (node.type === "leaf")
    if (node.index === index) return node.value;
    else return undefined;
}

function TreeUpdate(node, index, value) {
  if (node.type === "node") {
    if (index <= node.index) 
      TreeUpdate(node.left, index, value);
    else TreeUpdate(node.right, index, value)
    node.value = hash(node.left.value, node.right.value);
  }
  else if (node.type === "leaf")
    if (node.index === index) node.value = value;
    else throw("Key not found");
}


function TreeRotate(tree, node) {

  const zkOrder = [
    [0, 1, 2, 3],
    [2, 0, 1, 3],
    [3, 0, 1, 2],
    [3, 2, 0, 1]
  ];


  let rotation = (node.left.height > node.right.height) ? 0 : 2;
  let t = (rotation == 0) ? node.left : node.right;
  rotation += (t.left.height > t.right.height) ? 0 : 1;

  let elements = [];
  let indexes = [];
  switch (rotation) {
    case 0:
      elements = [node.left.left.left, node.left.left.right, node.left.right, node.right];
      indexes = [node.left.index, node.left.left.index, node.index];
      break;
    case 1:
      elements = [node.left.left, node.left.right.left, node.left.right.right, node.right];
      indexes = [node.left.right.index, node.left.index, node.index];
      break;
    case 2:
      elements = [node.left, node.right.left.left, node.right.left.right, node.right.right];
      indexes = [node.right.left.index, node.index, node.right.index];
      break;
    case 3:
      elements = [node.left, node.right.left, node.right.left, node.right.right.left, node.right.right.right];
      indexes = [node.right.index, node.index, node.right.right.index];
      break;
  }

  const result = {
    type:"node",
    index: indexes[0],
    left: {
      type: "node",
      index: indexes[1],
      left: elements[0],
      right: elements[1]
    },
    right: {
      type: "node",
      index: indexes[2],
      left: elements[2],
      right: elements[3]
    }
  };

  result.left.height = Math.max(result.left.left.height, result.left.right.height) + 1;
  result.right.height = Math.max(result.right.left.height, result.right.right.height) + 1;
  result.height = Math.max(result.right.height, result.right.height) + 1;
  
  result.left.value = hash(result.left.left.value, result.left.right.value);
  result.right.value = hash(result.right.left.value, result.right.right.value);
  result.value = hash(result.right.value, result.right.value);
  update(node, result);

  const merklePath = Array(MAX_TREE_HEIGHT).fill(0n);
  const merkleSiblings = Array(MAX_TREE_HEIGHT).fill(0n);
  const merkleEnabled = Array(MAX_TREE_HEIGHT).fill(0n);

  let cursor = tree;
  let i = 0;
  while(cursor!==node) {
    if (cursor.index<=node.index) {
      merklePath[i] = 0;
      merkleSiblings[i] = cursor.right.value;
      merkleEnabled[i] = 1;
      cursor = cursor.left;
    } else {
      merklePath[i] = 1;
      merkleSiblings[i] = cursor.left.value;
      merkleEnabled[i] = 1;
      cursor = cursor.right;
    }
    i+=1;
  }

  return {rotation, merklePath, merkleSiblings, merkleEnabled, elements:zkOrder[rotation].map(x=>elements[x].value)};
}

function TreePut(tree, index, value) {
  const rotations = [];
  const NodePut = function(node, index) {
    if (node.type === "node") {
      if (index <= node.index) NodePut(node.left, index);
      else NodePut(node.right, index);
      if(Math.abs(node.left.height-node.right.height)>=2) {
        rotations.push(TreeRotate(tree, node));
      } else node.value = hash(node.left.value, node.right.value);
      node.height = Math.max(node.left.height, node.right.height)+1;
    }
    else if (node.type === "leaf") {
      const oldLeaf = copy(node);
      const newLeaf = {type: "leaf", height:1, value, index};
      const newNode = {type:"node", height:oldLeaf.height, index:(oldLeaf.index+newLeaf.index)/2n, height: Math.max(oldLeaf.height, newLeaf.height)+1 };
      if (oldLeaf.index <= newLeaf.index) 
        update(node, {...newNode, left:oldLeaf, right:newLeaf, value:hash(oldLeaf.value, newLeaf.value)});
      else 
        update(node, {...newNode, left:newLeaf, right:oldLeaf, value:hash(newLeaf.value, oldLeaf.value)})
    }
  }
  NodePut(tree, index);
  return rotations;
}




