#!/bin/bash

# Vérifie si kubectl est installé
if ! command -v kubectl &> /dev/null
then
    echo "kubectl n'est pas installé. Veuillez l'installer pour continuer."
    exit 1
fi

# Utiliser le daemon Docker de Minikube
# shellcheck disable=SC2046
eval $(minikube docker-env)

# Fonction pour appliquer les fichiers de déploiement et de service
deploy_service() {
  deployment_file=$1
  service_file=$2

  echo "Déploiement de $deployment_file..."
  kubectl apply -f $deployment_file
  if [ $? -ne 0 ]; then
      echo "Erreur lors du déploiement de $deployment_file."
      exit 1
  fi

  echo "Déploiement de $service_file..."
  kubectl apply -f $service_file
  if [ $? -ne 0 ]; then
      echo "Erreur lors du déploiement de $service_file."
      exit 1
  fi
}

# Déployer Zookeeper
deploy_service "deployment-zookeeper.yaml" "service-zookeeper.yaml"

# Déployer Kafka
deploy_service "deployment-kafka.yaml" "service-kafka.yaml"


echo "Les microservices Zookeeper et Kafka ont été déployés avec succès."
