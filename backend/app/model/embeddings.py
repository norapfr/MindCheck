"""
Generación de embeddings BERT — puerto de embeddings.py (SocialMindScan),
solo la parte usada por gru_depression_bert.keras y cnn_suicidio_bert.keras.
"""
import numpy as np
import torch
from transformers import BertModel, BertTokenizer

_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_tokenizer_bert = BertTokenizer.from_pretrained("bert-base-uncased")
_model_bert = BertModel.from_pretrained("bert-base-uncased").to(_DEVICE)
_model_bert.eval()


def getting_embedding_bert(texto: str, max_seq: int = 132) -> np.ndarray:
    inputs = _tokenizer_bert(
        texto,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=max_seq,
    )
    attention_mask = inputs["attention_mask"].to(_DEVICE)
    inputs = {k: v.to(_DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = _model_bert(**inputs)
        token_embs = outputs.last_hidden_state * attention_mask.unsqueeze(-1)
        token_embs = token_embs[:, 1:-1, :]

    return token_embs.squeeze(0).cpu().half().numpy()