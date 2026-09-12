"""
Preprocesado de texto — puerto directo de redditapp/utils/text_utils.py
(SocialMindScan) al backend de MindCheck.
"""
import re
import string
import unicodedata
import warnings

import emoji
import contractions
import spacy
import nltk
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
from nltk.corpus import stopwords, wordnet
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag

warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)


def _ensure_nltk_resources():
    resources = [
        ("tokenizers/punkt", "punkt"),
        ("tokenizers/punkt_tab", "punkt_tab"),
        ("taggers/averaged_perceptron_tagger", "averaged_perceptron_tagger"),
        ("taggers/averaged_perceptron_tagger_eng", "averaged_perceptron_tagger_eng"),
        ("corpora/stopwords", "stopwords"),
        ("corpora/wordnet", "wordnet"),
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(name, quiet=True)


_ensure_nltk_resources()

_SPACY_MODEL_NAME = "en_core_web_sm"
_SPACY_EXCLUDE = ["tagger", "parser", "attribute_ruler", "lemmatizer"]
try:
    _nlp = spacy.load(_SPACY_MODEL_NAME, exclude=_SPACY_EXCLUDE)
except OSError:
    from spacy.cli import download as spacy_download

    spacy_download(_SPACY_MODEL_NAME)
    _nlp = spacy.load(_SPACY_MODEL_NAME, exclude=_SPACY_EXCLUDE)


def get_wordnet_pos(treebank_tag: str):
    if treebank_tag.startswith("J"):
        return wordnet.ADJ
    elif treebank_tag.startswith("V"):
        return wordnet.VERB
    elif treebank_tag.startswith("R"):
        return wordnet.ADV
    return wordnet.NOUN


def remove_html(text: str) -> str:
    return BeautifulSoup(text, "html.parser").get_text()


def remove_named_entities(tokens: list[str]) -> list[str]:
    doc = _nlp(" ".join(tokens))
    return [token.text for token in doc if token.ent_type_ == ""]


def clean_text(text: str) -> str:
    text = text.lower()
    text = remove_html(text)

    text = re.sub(r"http[s]?://\S+", "", text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8", "ignore")
    text = contractions.fix(text)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = emoji.replace_emoji(text, replace=" ")
    text = re.sub(r"\d+", " ", text)
    text = re.sub(r"[^a-z\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    tokens = word_tokenize(text)

    table = str.maketrans("", "", string.punctuation)
    stripped = [w.translate(table) for w in tokens]
    words = [w for w in stripped if w.isalpha()]
    words = remove_named_entities(words)

    stop_words = set(stopwords.words("english"))
    negation_words = {
        "no", "not", "nor", "never", "neither", "none", "n't",
        "myself", "alone", "against", "nobody", "still",
    }
    filtered_stop_words = stop_words - negation_words
    words = [w for w in words if w not in filtered_stop_words]
    words = [w for w in words if len(w) > 1]

    lemmatizer = WordNetLemmatizer()
    tagged = pos_tag(words)
    words = [lemmatizer.lemmatize(token, get_wordnet_pos(tag)) for token, tag in tagged]

    return " ".join(words)