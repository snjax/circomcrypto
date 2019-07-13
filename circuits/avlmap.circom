include "../node_modules/circomlib/circuits/mimc.circom";

template ArbitraryMerkleProof(N) {
  signal input path[N];
  signal input sibling[N];
  signal input enabled[N]
  signal input leaf;
  signal output root;

  component hash[N];
  component node[N+1];

  node[0] <== leaf;

  for(var i=0; i<N; i++) {
    hash[i] = MultiMiMC7(2,91);
    hash[i].in[0] <== sibling[i] + (node[i] - sibling[i]) * (1 - path[i]);
    hash[i].in[1] <== sibling[i] + node[i] - hash[i].in[0];
    node[i+1] <== node[i] + (hash[i].out - node[i]) * enabled[i];
  }
  root <== node[N];
}

template Rotate(N) {
  signal input element[4];
  signal input rotation[2];
  signal input enabled[N];
  signal input path[N];
  signal input sibling[N];
  signal output root[2];

  component hash[3];
  
  hash[0] = MultiMiMC7(2,91);
  hash[0].in[0] = element[0];
  hash[0].in[1] = element[1];

  hash[1] = MultiMiMC7(2,91);
  hash[1].in[0] = hash[0].out + (element[2] - hash[0].out) * rotation[0];
  hash[1].in[1] = element[2] + hash[0].out - hash[1].in[0];

  hash[2] = MultiMiMC7(2,91);
  hash[2].in[0] = hash[1].out + (element[3] - hash[1].out) * rotation[1];
  hash[2].in[1] = element[3] + hash[1].out - hash[2].in[0];

  component nhash[3]
  
  nhash[0] = MultiMiMC7(2,91);
  nhash[0].in[0] = element[0];
  nhash[0].in[1] = element[1];

  nhash[1] = MultiMiMC7(2,91);
  nhash[1].in[0] = element[2];
  nhash[1].in[1] = element[3];

  nhash[2] = MultiMiMC7(2,91);
  nhash[2].in[0] = nhash[0].out;
  nhash[2].in[1] = nhash[1].out;

  component merkleProof[2];

  for (var j=0; i<2; j++) {
    merkleProof[j] = ArbitraryMerkleProof(N);
    for (var i=0; i<N; i++) {
      merkleProof[j].path[i] <== path[i];
      merkleProof[j].sibling[i] <== sibling[i];
      merkleProof[j].enabled[i] <== enabled[i];
    }
    root[j] <== merkleProof[j].root;
  }

  merkleProof[0].leaf <== hash[2].out;
  merkleProof[1].leaf <== nhash[2].out;

}