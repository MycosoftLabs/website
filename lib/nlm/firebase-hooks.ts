'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export function useModels(userId: string | undefined, isAdmin?: boolean) {
  const [models, setModels] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;

    // If admin, we fetch all models, otherwise only the user's models
    let q = query(
      collection(db, 'models'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'models'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      setModels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (models):", error);
      setLoadedUserId(userId);
    });
  }, [userId, isAdmin]);

  return { models, loading };
}

export function useTrainingRuns(modelId: string | undefined, userId?: string, isAdmin?: boolean) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;

    let q = query(
      collection(db, 'training_runs'),
      where('modelId', '==', modelId),
      orderBy('startTime', 'desc'),
      limit(10)
    );

    if (!isAdmin && userId) {
      q = query(
        collection(db, 'training_runs'),
        where('modelId', '==', modelId),
        where('ownerId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(10)
      );
    }

    return onSnapshot(q, (snapshot) => {
      setRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (runs):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { runs, loading };
}

export function useAllTrainingRuns(userId: string | undefined, isAdmin?: boolean) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;
    let q = query(
      collection(db, 'training_runs'),
      orderBy('startTime', 'desc'),
      limit(20)
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'training_runs'),
        where('ownerId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(20)
      );
    }

    return onSnapshot(q, (snapshot) => {
      setRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (all runs):", error);
      setLoadedUserId(userId);
    });
  }, [userId]);

  return { runs, loading };
}

export function useFrames(modelId: string | undefined) {
  const [frames, setFrames] = useState<any[]>([]);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;
    const q = query(
      collection(db, 'frames'),
      where('modelId', '==', modelId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      setFrames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (frames):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { frames, loading };
}

export function useAllFrames(userId?: string, isAdmin?: boolean) {
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(
      collection(db, 'frames'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    if (userId && !isAdmin) {
      q = query(
        collection(db, 'frames'),
        where('ownerId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    return onSnapshot(q, (snapshot) => {
      setFrames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (all frames):", error);
      setLoading(false);
    });
  }, [userId, isAdmin]);

  return { frames, loading };
}

export function useFingerprints(frameRoot: string | undefined) {
  const [fingerprints, setFingerprints] = useState<any[]>([]);
  const [loadedRoot, setLoadedRoot] = useState<string | undefined>(undefined);

  const loading = frameRoot ? (frameRoot !== loadedRoot) : false;

  useEffect(() => {
    if (!frameRoot) return;

    const q = query(collection(db, 'fingerprints'), where('frame_root', '==', frameRoot));
    return onSnapshot(q, (snapshot) => {
      setFingerprints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedRoot(frameRoot);
    }, (error) => {
      console.error("Firestore Error (fingerprints):", error);
      setLoadedRoot(frameRoot);
    });
  }, [frameRoot]);

  return { fingerprints, loading };
}

export function useVariants(userId?: string, isAdmin?: boolean) {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'variants'), orderBy('timestamp', 'desc'));

    if (userId && !isAdmin) {
      q = query(collection(db, 'variants'), where('ownerId', '==', userId), orderBy('timestamp', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      setVariants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (variants):", error);
      setLoading(false);
    });
  }, [userId, isAdmin]);

  return { variants, loading };
}

export function useJudgments(targetId: string | undefined, userId?: string, isAdmin?: boolean) {
  const [judgments, setJudgments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'judgments'), orderBy('timestamp', 'desc'), limit(50));

    if (targetId) {
      q = query(collection(db, 'judgments'), where('targetId', '==', targetId), orderBy('timestamp', 'desc'), limit(50));
    } else if (userId && !isAdmin) {
      q = query(collection(db, 'judgments'), where('ownerId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
    }

    return onSnapshot(q, (snapshot) => {
      setJudgments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (judgments):", error);
      setLoading(false);
    });
  }, [targetId, userId, isAdmin]);

  return { judgments, loading };
}

export function useTrainingRun(runId: string | undefined) {
  const [run, setRun] = useState<any>(null);
  const [loadedRunId, setLoadedRunId] = useState<string | undefined>(undefined);

  const loading = runId ? (runId !== loadedRunId) : false;

  useEffect(() => {
    if (!runId) return;
    const docRef = doc(db, 'training_runs', runId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setRun({ id: doc.id, ...doc.data() });
      }
      setLoadedRunId(runId);
    }, (error) => {
      console.error("Firestore Error (run):", error);
      setLoadedRunId(runId);
    });
  }, [runId]);

  return { run, loading };
}

export function usePipelines(userId: string | undefined, isAdmin?: boolean) {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;

    let q = query(collection(db, 'pipelines'));

    if (!isAdmin) {
      q = query(
        collection(db, 'pipelines'),
        where('ownerId', '==', userId)
      );
    }

    return onSnapshot(q, (snapshot) => {
      setPipelines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (pipelines):", error);
      setLoadedUserId(userId);
    });
  }, [userId, isAdmin]);

  return { pipelines, loading };
}

export function useCheckpoints(modelId: string | undefined) {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;

    const q = query(
      collection(db, `models/${modelId}/checkpoints`),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setCheckpoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (checkpoints):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { checkpoints, loading };
}

export function useMutations(modelId: string | undefined) {
  const [mutations, setMutations] = useState<any[]>([]);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;

    const q = query(collection(db, 'mutations'), where('modelId', '==', modelId), orderBy('timestamp', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
      setMutations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (mutations):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { mutations, loading };
}

export function useCognitiveGraphs(modelId: string | undefined, frameId?: string) {
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

  const currentKey = modelId ? `${modelId}-${frameId || ''}` : undefined;
  const loading = currentKey ? (currentKey !== loadedKey) : false;

  useEffect(() => {
    if (!modelId) return;

    let q = query(
      collection(db, 'graphs'),
      where('modelId', '==', modelId)
    );

    if (frameId) {
      q = query(q, where('frameId', '==', frameId));
    }

    return onSnapshot(q, (snapshot) => {
      setGraphs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedKey(currentKey);
    }, (error) => {
      console.error("Firestore Error (graphs):", error);
      setLoadedKey(currentKey);
    });
  }, [modelId, frameId, currentKey]);

  return { graphs, loading };
}

export function useMutationRecipes(userId: string | undefined, isAdmin?: boolean) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;

    let q = query(
      collection(db, 'mutation_recipes'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'mutation_recipes'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (recipes):", error);
      setLoadedUserId(userId);
    });
  }, [userId, isAdmin]);

  return { recipes, loading };
}

export function useModelVersions(modelId: string | undefined) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;

    const q = query(
      collection(db, `models/${modelId}/versions`),
      orderBy('versionNumber', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setVersions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (versions):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { versions, loading };
}

export function useAgents(userId: string | undefined, isAdmin?: boolean) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;

    let q = query(
      collection(db, 'agents'),
      orderBy('lastActive', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'agents'),
        where('ownerId', '==', userId),
        orderBy('lastActive', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      setAgents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (agents):", error);
      setLoadedUserId(userId);
    });
  }, [userId, isAdmin]);

  return { agents, loading };
}

export function useAgentTasks(userId: string | undefined, agentId?: string, isAdmin?: boolean) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

  const currentKey = userId ? `${userId}-${agentId || ''}-${isAdmin ? 'admin' : 'user'}` : undefined;
  const loading = currentKey ? (currentKey !== loadedKey) : false;

  useEffect(() => {
    if (!userId) return;

    let q = query(
      collection(db, 'agent_tasks'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'agent_tasks'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    if (agentId) {
      q = query(q, where('agentId', '==', agentId));
    }

    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedKey(currentKey);
    }, (error) => {
      console.error("Firestore Error (agent_tasks):", error);
      setLoadedKey(currentKey);
    });
  }, [userId, agentId, currentKey, isAdmin]);

  return { tasks, loading };
}

export function useAutomationPolicies(userId: string | undefined, isAdmin?: boolean) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined);

  const loading = userId ? (userId !== loadedUserId) : false;

  useEffect(() => {
    if (!userId) return;

    let q = query(
      collection(db, 'automation_policies'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'automation_policies'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      setPolicies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadedUserId(userId);
    }, (error) => {
      console.error("Firestore Error (automation_policies):", error);
      setLoadedUserId(userId);
    });
  }, [userId, isAdmin]);

  return { policies, loading };
}

export function useModel(modelId: string | undefined) {
  const [model, setModel] = useState<any>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined);

  const loading = modelId ? (modelId !== loadedModelId) : false;

  useEffect(() => {
    if (!modelId) return;
    const docRef = doc(db, 'models', modelId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setModel({ id: doc.id, ...doc.data() });
      }
      setLoadedModelId(modelId);
    }, (error) => {
      console.error("Firestore Error (model):", error);
      setLoadedModelId(modelId);
    });
  }, [modelId]);

  return { model, loading };
}
